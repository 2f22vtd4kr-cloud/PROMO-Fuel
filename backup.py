"""Daily SQLite backup — hot-copy, gzip compress, AES-256-CTR encrypt, deliver to Telegram.

Architecture
------------
  _backup_loop()                background asyncio task (started via start_backup_scheduler)
    └─ run_backup_once()        one full cycle: copy → compress → [encrypt] → deliver + local copy
         ├─ _make_backup_bytes()  runs in thread-pool (blocking I/O)
         │    ├─ sqlite3 backup API (safe hot-copy, works during active writes)
         │    ├─ gzip.GzipFile compression
         │    └─ AES-256-CTR encryption (pyaes, optional — requires BACKUP_ENCRYPTION_KEY)
         ├─ _save_local()         writes to ./backups/ and prunes files > 7 days old
         └─ _send_to_telegram()   multipart POST to Bot API sendDocument

Environment variables
---------------------
  TELEGRAM_TOKEN           Bot token (shared with main.py).
  BACKUP_CHAT_ID           Telegram chat / channel ID to receive backups.
                           Defaults to ADMIN_TELEGRAM_ID if unset.
  BACKUP_ENCRYPTION_KEY    64 hex chars (= 32 raw bytes) for AES-256-CTR.
                           Generate with:
                               python3 -c "import os,binascii; print(binascii.hexlify(os.urandom(32)).decode())"
                           When not set the backup is still compressed but NOT encrypted.
  DB_PATH                  Path to SQLite DB (default: campaigns.db).
  BACKUP_INTERVAL_SECONDS  Override the 24-hour cycle (default: 86400).
  BACKUP_INITIAL_DELAY     Seconds before the first backup fires (default: 300).
"""
from __future__ import annotations

import asyncio
import gzip
import hashlib
import io
import logging
import logging.handlers as _log_handlers
import os
import shutil
import sqlite3
import tempfile
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ── Rotating file handler for backup logs ─────────────────────────────────────
os.makedirs("logs", exist_ok=True)
_bak_fh = _log_handlers.RotatingFileHandler(
    "logs/backup.log",
    maxBytes=2_000_000,
    backupCount=2,
    encoding="utf-8",
)
_bak_fh.setFormatter(logging.Formatter("%(asctime)s [%(name)s] %(levelname)s %(message)s"))
logging.getLogger().addHandler(_bak_fh)

# ── Configuration ──────────────────────────────────────────────────────────────
TELEGRAM_TOKEN        = os.getenv("TELEGRAM_TOKEN", "")
_raw_chat_id          = os.getenv("BACKUP_CHAT_ID") or os.getenv("ADMIN_TELEGRAM_ID") or "0"
BACKUP_CHAT_ID        = int(_raw_chat_id) if _raw_chat_id.lstrip("-").isdigit() else 0
BACKUP_ENCRYPTION_KEY = os.getenv("BACKUP_ENCRYPTION_KEY", "")   # 64 hex chars = 32 bytes
DB_PATH               = os.getenv("DB_PATH", "campaigns.db")
BACKUP_INTERVAL       = int(os.getenv("BACKUP_INTERVAL_SECONDS", "86400"))   # 24 h
BACKUP_INITIAL_DELAY  = int(os.getenv("BACKUP_INITIAL_DELAY", "300"))        # 5 min
LOCAL_BACKUP_DIR      = "backups"
LOCAL_RETENTION_DAYS  = 7

_backup_task: asyncio.Task | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Crypto helpers
# ─────────────────────────────────────────────────────────────────────────────

def _derive_key(hex_key: str, salt: bytes) -> bytes:
    """PBKDF2-HMAC-SHA256 — derive a 32-byte AES key from the hex secret + random salt."""
    raw = bytes.fromhex(hex_key)
    return hashlib.pbkdf2_hmac("sha256", raw, salt, iterations=100_000, dklen=32)


def _encrypt_aes256_ctr(plaintext: bytes, key: bytes) -> bytes:
    """AES-256-CTR encrypt via pyaes (pure-Python, ships with telethon).

    Output format: 16-byte random nonce || ciphertext
    The nonce is NOT a secret — it ensures the counter is unique per backup.
    """
    import pyaes  # transitive dep of telethon; always present
    nonce   = os.urandom(16)
    counter = pyaes.Counter(initial_value=int.from_bytes(nonce, "big"))
    aes     = pyaes.AESModeOfOperationCTR(key, counter=counter)
    return nonce + aes.encrypt(plaintext)


def _encrypt_payload(compressed: bytes) -> tuple[bytes, bool]:
    """Wrap compression output in AES-256-CTR + PBKDF2 envelope.

    Wire format (all big-endian / raw bytes):
        16 B  — PBKDF2 salt
        16 B  — AES-CTR nonce   (prepended by _encrypt_aes256_ctr)
        N  B  — AES-CTR ciphertext of the gzipped DB

    Returns (payload, encrypted=True) on success, (compressed, False) on any failure.
    """
    if not BACKUP_ENCRYPTION_KEY:
        return compressed, False

    try:
        salt    = os.urandom(16)
        key     = _derive_key(BACKUP_ENCRYPTION_KEY, salt)
        payload = salt + _encrypt_aes256_ctr(compressed, key)
        logger.debug("[backup] Encryption OK — salt+nonce+ciphertext = %d B", len(payload))
        return payload, True
    except Exception as enc_err:
        logger.warning(
            "[backup] AES encryption failed (%s) — sending compressed but unencrypted backup",
            enc_err,
        )
        return compressed, False


# ─────────────────────────────────────────────────────────────────────────────
# Core backup pipeline (runs in thread-pool executor — all blocking I/O)
# ─────────────────────────────────────────────────────────────────────────────

def _make_backup_bytes(db_path: str) -> tuple[bytes, bool]:
    """Produce the final backup payload synchronously.

    Steps:
      1. Hot-copy via sqlite3.Connection.backup() — safe during active writes,
         produces a consistent snapshot without locking the source.
      2. gzip compress the copy.
      3. Optionally AES-256-CTR encrypt.

    Returns (payload_bytes, encrypted: bool).
    """
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".db")
    os.close(tmp_fd)
    try:
        # Step 1 — consistent hot-copy (sqlite3 backup API)
        src = sqlite3.connect(db_path, timeout=60)
        dst = sqlite3.connect(tmp_path)
        src.backup(dst, pages=64)   # copy in 64-page chunks to stay non-blocking
        dst.close()
        src.close()

        # Step 2 — gzip (level 6 balances speed vs size)
        buf = io.BytesIO()
        with open(tmp_path, "rb") as f_in, gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=6) as gz:
            shutil.copyfileobj(f_in, gz)
        compressed = buf.getvalue()

        # Step 3 — AES-256-CTR encrypt (optional)
        return _encrypt_payload(compressed)

    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Local copy + retention
# ─────────────────────────────────────────────────────────────────────────────

def _save_local(payload: bytes, filename: str) -> str | None:
    """Write backup to LOCAL_BACKUP_DIR and prune files older than LOCAL_RETENTION_DAYS."""
    os.makedirs(LOCAL_BACKUP_DIR, exist_ok=True)
    local_path = os.path.join(LOCAL_BACKUP_DIR, filename)
    try:
        with open(local_path, "wb") as f:
            f.write(payload)
        logger.info("[backup] Local copy saved: %s (%d KB)", local_path, len(payload) // 1024)

        # Prune old backups
        cutoff = time.time() - LOCAL_RETENTION_DAYS * 86_400
        pruned = 0
        for fname in os.listdir(LOCAL_BACKUP_DIR):
            fpath = os.path.join(LOCAL_BACKUP_DIR, fname)
            if os.path.isfile(fpath) and os.path.getmtime(fpath) < cutoff:
                os.unlink(fpath)
                pruned += 1
        if pruned:
            logger.info("[backup] Pruned %d local backup(s) older than %d days", pruned, LOCAL_RETENTION_DAYS)

        return local_path
    except Exception as exc:
        logger.warning("[backup] Local save failed: %s", exc)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Telegram delivery
# ─────────────────────────────────────────────────────────────────────────────

async def _send_to_telegram(payload: bytes, filename: str, encrypted: bool) -> bool:
    """Upload backup as a Telegram document via Bot API multipart POST.

    Uses aiohttp (already a project dependency). The upload is bounded to a
    120-second timeout — large databases on slow connections may need tuning via
    BACKUP_INITIAL_DELAY / BACKUP_INTERVAL env vars.
    """
    if not TELEGRAM_TOKEN:
        logger.warning("[backup] TELEGRAM_TOKEN not set — skipping Telegram delivery")
        return False
    if not BACKUP_CHAT_ID:
        logger.warning("[backup] BACKUP_CHAT_ID / ADMIN_TELEGRAM_ID not set — skipping delivery")
        return False

    enc_note = "🔐 AES-256-CTR encrypted" if encrypted else "⚠️ unencrypted (set BACKUP_ENCRYPTION_KEY)"
    caption  = (
        f"🗄 *DB Backup*\n"
        f"📅 {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n"
        f"📦 {len(payload) // 1024} KB — {enc_note}"
    )

    try:
        import aiohttp
        url  = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendDocument"
        form = aiohttp.FormData()
        form.add_field("chat_id",    str(BACKUP_CHAT_ID))
        form.add_field("caption",    caption)
        form.add_field("parse_mode", "Markdown")
        form.add_field(
            "document",
            payload,
            filename=filename,
            content_type="application/octet-stream",
        )

        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                data=form,
                timeout=aiohttp.ClientTimeout(total=120),
            ) as resp:
                body = await resp.json()
                if resp.status == 200 and body.get("ok"):
                    logger.info(
                        "[backup] ✓ Delivered %s (%d KB) to chat_id=%s",
                        filename, len(payload) // 1024, BACKUP_CHAT_ID,
                    )
                    return True

                logger.error("[backup] Telegram API error %d: %s", resp.status, body)
                return False

    except Exception as exc:
        logger.error("[backup] Telegram delivery failed: %s", exc, exc_info=True)
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

async def run_backup_once() -> dict:
    """Perform one full backup cycle.

    Returns a status dict:
        ok          bool    — True if Telegram delivery succeeded
        local_path  str|None
        size_kb     int
        encrypted   bool
        filename    str
        error       str|None
    """
    if not os.path.exists(DB_PATH):
        msg = f"{DB_PATH} does not exist — skipping backup"
        logger.warning("[backup] %s", msg)
        return {"ok": False, "error": msg}

    ts   = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    loop = asyncio.get_event_loop()

    logger.info("[backup] Starting backup of %s …", DB_PATH)
    try:
        payload, encrypted = await loop.run_in_executor(None, _make_backup_bytes, DB_PATH)
    except Exception as exc:
        logger.error("[backup] Backup preparation failed: %s", exc, exc_info=True)
        return {"ok": False, "error": str(exc)}

    ext        = ".db.gz.enc" if encrypted else ".db.gz"
    filename   = f"promo_fuel_{ts}{ext}"
    size_kb    = len(payload) // 1024

    logger.info("[backup] Payload ready: %s (%d KB, encrypted=%s)", filename, size_kb, encrypted)

    local_path = await loop.run_in_executor(None, _save_local, payload, filename)
    ok         = await _send_to_telegram(payload, filename, encrypted)

    return {
        "ok":         ok,
        "local_path": local_path,
        "size_kb":    size_kb,
        "encrypted":  encrypted,
        "filename":   filename,
        "error":      None if ok else "Telegram delivery failed (see logs)",
    }


async def _backup_loop() -> None:
    """Background loop — waits BACKUP_INITIAL_DELAY, then fires every BACKUP_INTERVAL."""
    logger.info(
        "[backup] Scheduler armed — first backup in %ds, then every %ds (%dh)",
        BACKUP_INITIAL_DELAY, BACKUP_INTERVAL, BACKUP_INTERVAL // 3600,
    )
    await asyncio.sleep(BACKUP_INITIAL_DELAY)
    while True:
        try:
            result = await run_backup_once()
            if not result["ok"]:
                logger.warning("[backup] Cycle completed with errors: %s", result.get("error"))
        except Exception as exc:
            logger.error("[backup] Unexpected error in backup loop: %s", exc, exc_info=True)
        await asyncio.sleep(BACKUP_INTERVAL)


def start_backup_scheduler() -> None:
    """Launch the backup loop as a background asyncio task."""
    global _backup_task
    if _backup_task is None or _backup_task.done():
        _backup_task = asyncio.create_task(_backup_loop())
        enc_status   = "encrypted (AES-256-CTR)" if BACKUP_ENCRYPTION_KEY else "unencrypted — set BACKUP_ENCRYPTION_KEY"
        logger.info(
            "[backup] Daily backup scheduler started — chat_id=%s  payload=%s",
            BACKUP_CHAT_ID or "NOT SET",
            enc_status,
        )
    else:
        logger.debug("[backup] Backup scheduler already running")


def stop_backup_scheduler() -> None:
    global _backup_task
    if _backup_task and not _backup_task.done():
        _backup_task.cancel()
        _backup_task = None
        logger.info("[backup] Backup scheduler stopped")
