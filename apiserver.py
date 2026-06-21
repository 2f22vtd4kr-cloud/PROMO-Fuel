"""FastAPI control plane for PROMO-Fuel multi-worker operations.

Routers
-------
/api/auth        — Interactive Telethon account authentication
/api/metrics     — Worker health, queue sizes, account status
/api/campaigns   — Manual broadcast triggers and per-campaign task management
/api/admin       — Stale lock recovery, manual worker release, system snapshot

Auth flow (HTTP-lifecycle-safe)
--------------------------------
  active_login_clients: dict[str, _LoginSession]
    key   = normalised phone string (e.g. "+79001234567")
    value = _LoginSession holding the live TelegramClient, phone_code_hash,
            account_id, proxy config, and awaiting_2fa flag.

The dict is protected by _clients_lock (asyncio.Lock).  Clients intentionally
survive across disconnected HTTP request/response cycles — that is the entire
purpose of the in-memory store.  A background sweep evicts sessions older than
SESSION_TTL_SECONDS (default 15 min) to prevent unbounded accumulation.

Session file convention (matches telethon_auth.py):
  {SESSION_DIR}/{phone_digits}   e.g. ./sessions/79001234567
Telethon appends ".session" automatically, so the .session file lives at
  ./sessions/79001234567.session

Auth-status lifecycle
---------------------
  send-code  → auth_status = 'authenticating'
  sign-in OK → auth_status = 'active',  status = 'idle'
  any error  → auth_status = 'idle'     (reset so the account can retry)
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import sqlite3

import aiosqlite
from fastapi import APIRouter, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from telethon import TelegramClient
from telethon.errors import (
    FloodWaitError,
    PhoneCodeExpiredError,
    PhoneCodeInvalidError,
    PhoneNumberInvalidError,
    SessionPasswordNeededError,
)

from dbmigrations import run_migrations
from task_queue import TaskQueue, _conn as _sq_conn, _ensure_tables
from utils.proxy import parse_proxies, proxy_label, proxy_to_telethon
from utils.supervisor import get_worker_statuses, reap_dead_workers

logger = logging.getLogger(__name__)

# ── Environment ───────────────────────────────────────────────────────────────
DB_PATH     = os.getenv("DB_PATH",          "campaigns.db")
SESSION_DIR = os.getenv("SESSION_DIR",      "./sessions")
API_PORT    = int(os.getenv("API_SERVER_PORT", "8083"))

SESSION_TTL_SECONDS = 900   # evict stale login sessions after 15 min

os.makedirs(SESSION_DIR, exist_ok=True)


# ── Shared TaskQueue (process-wide singleton) ─────────────────────────────────
_task_queue: TaskQueue | None = None


def _tq() -> TaskQueue:
    global _task_queue
    if _task_queue is None:
        _task_queue = TaskQueue(db_path=DB_PATH)
    return _task_queue


# ── SQLite helpers ────────────────────────────────────────────────────────────

def _session_path(phone: str) -> str:
    """Return the bare Telethon session path for *phone* (no .session suffix)."""
    digits = phone.replace("+", "").replace(" ", "").replace("-", "")
    return os.path.join(SESSION_DIR, digits)


@asynccontextmanager
async def _aio_conn():
    """Async context manager: open an aiosqlite connection with WAL pragmas."""
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA synchronous=NORMAL")
        await conn.execute("PRAGMA busy_timeout=30000")
        await conn.execute("PRAGMA foreign_keys=ON")
        yield conn


async def _set_account_auth_status(
    account_id: int,
    auth_status: str,
    status: str | None = None,
) -> None:
    """Write auth_status (and optionally status) for a sender account."""
    async with _aio_conn() as conn:
        if status is not None:
            await conn.execute(
                "UPDATE sender_accounts SET auth_status = ?, status = ? WHERE id = ?",
                (auth_status, status, account_id),
            )
        else:
            await conn.execute(
                "UPDATE sender_accounts SET auth_status = ? WHERE id = ?",
                (auth_status, account_id),
            )
        await conn.commit()


async def _get_account(account_id: int) -> dict | None:
    async with _aio_conn() as conn:
        async with conn.execute(
            "SELECT * FROM sender_accounts WHERE id = ?", (account_id,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


# ── In-memory login session store ─────────────────────────────────────────────

@dataclass
class _LoginSession:
    """Holds a live Telethon client between /send-code and /sign-in HTTP calls."""
    client:          TelegramClient
    phone_code_hash: str
    account_id:      int
    proxy_used:      dict | None
    awaiting_2fa:    bool  = False
    created_at:      float = field(default_factory=time.monotonic)


# The in-memory store.  Never read or mutate outside of _clients_lock.
active_login_clients: dict[str, _LoginSession] = {}
_clients_lock = asyncio.Lock()


async def _cleanup_expired_sessions() -> None:
    """Background task: evict login sessions older than SESSION_TTL_SECONDS."""
    while True:
        await asyncio.sleep(60)
        now   = time.monotonic()
        stale: list[str] = []
        async with _clients_lock:
            stale = [
                phone for phone, sess in active_login_clients.items()
                if now - sess.created_at > SESSION_TTL_SECONDS
            ]
        for phone in stale:
            async with _clients_lock:
                sess = active_login_clients.pop(phone, None)
            if sess:
                try:
                    await sess.client.disconnect()
                except Exception:
                    pass
                logger.info("[auth] Evicted stale login session for %s (age>%ds)",
                            phone, SESSION_TTL_SECONDS)


# ── Application lifespan ──────────────────────────────────────────────────────

@asynccontextmanager
async def _lifespan(app: FastAPI):  # noqa: ARG001
    # ── Startup ──────────────────────────────────────────────────────────────
    # _ensure_tables creates the task-queue schema (INTEGER PK for tasks,
    # sender_accounts, broadcast_workers, worker_heartbeats).
    # run_migrations then adds the rest idempotently (group_campaigns,
    # group_campaign_sends, users, campaigns, sends, etc.).
    # Order matters: task_queue tables first so run_migrations sees them.
    _ensure_tables(DB_PATH)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: run_migrations(DB_PATH))

    released = await loop.run_in_executor(
        None, lambda: _tq().recover_stale_locks_sync(300)
    )
    if released:
        logger.info("[apiserver] Startup: recovered %d stale account lock(s)", released)

    _cleanup_task = asyncio.create_task(_cleanup_expired_sessions())
    logger.info("[apiserver] FastAPI control plane started — port %d", API_PORT)

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    _cleanup_task.cancel()
    async with _clients_lock:
        for phone, sess in list(active_login_clients.items()):
            try:
                await sess.client.disconnect()
            except Exception:
                pass
    logger.info("[apiserver] FastAPI control plane shut down")


# ── App + CORS ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="PROMO-Fuel Control Plane",
    version="1.0.0",
    lifespan=_lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═════════════════════════════════════════════════════════════════════════════
# Router: /api/auth  — interactive Telethon account authentication
# ═════════════════════════════════════════════════════════════════════════════

auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Request / response models ─────────────────────────────────────────────────

class SendCodeRequest(BaseModel):
    """Identify the account to authenticate by its DB primary key."""
    account_id: int


class SendCodeResponse(BaseModel):
    phone_code_hash: str
    phone:           str
    proxy_label:     str | None = None


class SignInRequest(BaseModel):
    phone:           str
    code:            str
    phone_code_hash: str


class SignInResponse(BaseModel):
    ok:           bool       = False
    needs_2fa:    bool       = False
    display_name: str | None = None
    session_file: str | None = None


class SignIn2FARequest(BaseModel):
    phone:    str
    password: str


class SignIn2FAResponse(BaseModel):
    ok:           bool
    display_name: str | None = None
    session_file: str | None = None


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _me_display(client: TelegramClient, fallback: str) -> str:
    try:
        me = await client.get_me()
        if me and me.username:
            return f"@{me.username}"
        return (me.first_name if me else None) or fallback
    except Exception:
        return fallback


def _pick_proxy(account: dict) -> dict | None:
    """Return the index-correct proxy for *account*, or None if none configured."""
    raw     = account.get("proxies") or account.get("proxy")
    proxies = parse_proxies(raw)
    if not proxies:
        return None
    idx = int(account.get("proxy_index") or account.get("current_proxy_index") or 0)
    return proxies[idx % len(proxies)]


def _build_client(account: dict, proxy: dict | None) -> TelegramClient:
    """Construct a TelegramClient for *account*, optionally bound to *proxy*."""
    api_id   = account.get("api_id")
    api_hash = account.get("api_hash")
    if not api_id or not api_hash:
        raise HTTPException(422, detail="account is missing api_id / api_hash")
    tg_proxy = proxy_to_telethon(proxy) if proxy else None
    return TelegramClient(
        _session_path(account["phone"]),
        int(api_id),
        str(api_hash),
        proxy=tg_proxy,
    )


# ── POST /api/auth/send-code ──────────────────────────────────────────────────

@auth_router.post("/send-code", response_model=SendCodeResponse)
async def send_code(req: SendCodeRequest) -> SendCodeResponse:
    """
    Begin the Telegram OTP login flow for a sender account.

    Steps:
      1. Load the sender_accounts row; verify api_id + api_hash are set.
      2. Set auth_status = 'authenticating' in the DB.
      3. Allocate the account's configured proxy (index-aware from proxies JSON).
      4. Connect a Telethon client — if the session file already has a valid
         authorisation, skip the OTP and transition directly to 'active'.
      5. Call client.send_code_request(phone) to dispatch the Telegram OTP.
      6. Store the live client + phone_code_hash in active_login_clients
         so it survives across disconnected HTTP lifecycles.
      7. Return phone_code_hash to the caller (required for sign-in).

    If a previous in-flight session for the same phone exists it is
    disconnected first — allowing the operator to restart a stuck attempt.
    """
    account = await _get_account(req.account_id)
    if not account:
        raise HTTPException(404, detail=f"account {req.account_id} not found")

    phone = str(account["phone"]).strip()
    if not phone:
        raise HTTPException(422, detail="account has no phone number set")

    # Tear down any previous in-flight session for this phone number
    async with _clients_lock:
        old_sess = active_login_clients.pop(phone, None)
    if old_sess:
        try:
            await old_sess.client.disconnect()
        except Exception:
            pass
        logger.info("[auth] Replaced stale login session for %s", phone)

    # Transition the account to 'authenticating' in the DB
    await _set_account_auth_status(req.account_id, "authenticating")

    # Resolve the proxy this account should use
    proxy  = _pick_proxy(account)
    plabel = proxy_label(proxy) if proxy else None

    # Build and connect the Telethon client
    client = _build_client(account, proxy)
    try:
        await client.connect()
    except Exception as exc:
        await _set_account_auth_status(req.account_id, "idle")
        raise HTTPException(502, detail=f"Telegram connect failed: {exc}") from exc

    # Fast-path: session file is already authorised
    try:
        if await client.is_user_authorized():
            display = await _me_display(client, phone)
            await client.disconnect()
            await _set_account_auth_status(req.account_id, "active", status="idle")
            logger.info("[auth] %s already authorised as %s", phone, display)
            # Signal "already done" with a sentinel hash; caller must check for it.
            return SendCodeResponse(
                phone_code_hash="__already_authorized__",
                phone=phone,
                proxy_label=plabel,
            )
    except Exception:
        pass  # is_user_authorized can fail on a fresh session — continue normally

    # Dispatch the Telegram OTP
    try:
        sent = await client.send_code_request(phone)
    except FloodWaitError as exc:
        await client.disconnect()
        await _set_account_auth_status(req.account_id, "idle")
        raise HTTPException(
            429, detail=f"FloodWait: подождите {exc.seconds} сек"
        ) from exc
    except PhoneNumberInvalidError as exc:
        await client.disconnect()
        await _set_account_auth_status(req.account_id, "idle")
        raise HTTPException(422, detail="Неверный номер телефона") from exc
    except Exception as exc:
        await client.disconnect()
        await _set_account_auth_status(req.account_id, "idle")
        raise HTTPException(502, detail=str(exc)) from exc

    # Persist the live client across HTTP lifecycles
    async with _clients_lock:
        active_login_clients[phone] = _LoginSession(
            client=client,
            phone_code_hash=sent.phone_code_hash,
            account_id=req.account_id,
            proxy_used=proxy,
        )

    logger.info(
        "[auth] send_code OK  phone=%s  account_id=%d  proxy=%s",
        phone, req.account_id, plabel or "none",
    )
    return SendCodeResponse(
        phone_code_hash=sent.phone_code_hash,
        phone=phone,
        proxy_label=plabel,
    )


# ── POST /api/auth/sign-in ────────────────────────────────────────────────────

@auth_router.post("/sign-in", response_model=SignInResponse)
async def sign_in(req: SignInRequest) -> SignInResponse:
    """
    Submit the OTP received via Telegram.  Three outcomes:

      Success
        client.sign_in() returns a User.
        → auth_status = 'active', session file saved, client disconnected,
          session removed from active_login_clients.

      SessionPasswordNeededError
        Account has 2FA enabled.
        → awaiting_2fa flag set on the session (client stays alive).
        → Response: { "needs_2fa": true }

      Error (invalid / expired code, etc.)
        → HTTP 4xx.  For PhoneCodeExpiredError the session is evicted and
          auth_status reset to 'idle' so the operator can restart.
    """
    phone = req.phone.strip()

    async with _clients_lock:
        sess = active_login_clients.get(phone)

    if not sess:
        raise HTTPException(
            400,
            detail="Нет активной сессии авторизации. Сначала вызовите /send-code.",
        )

    client: TelegramClient = sess.client

    try:
        await client.sign_in(phone, req.code, phone_code_hash=req.phone_code_hash)

    except SessionPasswordNeededError:
        # Keep the client alive — the operator must call /sign-in-2fa next
        async with _clients_lock:
            if phone in active_login_clients:
                active_login_clients[phone].awaiting_2fa = True
        logger.info("[auth] 2FA required for %s", phone)
        return SignInResponse(needs_2fa=True)

    except PhoneCodeInvalidError as exc:
        raise HTTPException(400, detail="Неверный код. Попробуйте ещё раз.") from exc

    except PhoneCodeExpiredError as exc:
        # Evict the session — a fresh /send-code is required
        async with _clients_lock:
            active_login_clients.pop(phone, None)
        try:
            await client.disconnect()
        except Exception:
            pass
        await _set_account_auth_status(sess.account_id, "idle")
        raise HTTPException(400, detail="Код устарел. Запросите новый.") from exc

    except Exception as exc:
        logger.error("[auth] sign_in error for %s: %s", phone, exc)
        raise HTTPException(400, detail=str(exc)) from exc

    # ── Success path ───────────────────────────────────────────────────────────
    display_name = await _me_display(client, phone)
    session_file = f"{_session_path(phone)}.session"

    await client.disconnect()

    async with _clients_lock:
        active_login_clients.pop(phone, None)

    await _set_account_auth_status(sess.account_id, "active", status="idle")

    logger.info(
        "[auth] sign_in OK  phone=%s  display=%s  account_id=%d",
        phone, display_name, sess.account_id,
    )
    return SignInResponse(ok=True, display_name=display_name, session_file=session_file)


# ── POST /api/auth/sign-in-2fa ────────────────────────────────────────────────

@auth_router.post("/sign-in-2fa", response_model=SignIn2FAResponse)
async def sign_in_2fa(req: SignIn2FARequest) -> SignIn2FAResponse:
    """
    Submit the Telegram cloud password after a SessionPasswordNeededError.

    Requires an active session in active_login_clients[phone] with awaiting_2fa=True,
    i.e. /sign-in was called first and returned needs_2fa=True.
    """
    phone = req.phone.strip()

    async with _clients_lock:
        sess = active_login_clients.get(phone)

    if not sess:
        raise HTTPException(400, detail="Нет активной 2FA-сессии.")
    if not sess.awaiting_2fa:
        raise HTTPException(
            400,
            detail="2FA не запрашивалась. Сначала пройдите /sign-in.",
        )

    client: TelegramClient = sess.client

    try:
        await client.sign_in(password=req.password)
    except Exception as exc:
        logger.error("[auth] 2FA error for %s: %s", phone, exc)
        raise HTTPException(400, detail=str(exc)) from exc

    display_name = await _me_display(client, phone)
    session_file = f"{_session_path(phone)}.session"

    await client.disconnect()

    async with _clients_lock:
        active_login_clients.pop(phone, None)

    await _set_account_auth_status(sess.account_id, "active", status="idle")

    logger.info(
        "[auth] 2FA sign_in OK  phone=%s  display=%s  account_id=%d",
        phone, display_name, sess.account_id,
    )
    return SignIn2FAResponse(ok=True, display_name=display_name, session_file=session_file)


# ── DELETE /api/auth/{phone} — cancel an in-flight login ─────────────────────

@auth_router.delete("/{phone}")
async def cancel_auth(phone: str) -> dict:
    """Disconnect and evict a pending login session (e.g. operator closed the modal)."""
    phone = phone.strip()
    async with _clients_lock:
        sess = active_login_clients.pop(phone, None)
    if not sess:
        raise HTTPException(404, detail="No active login session for this phone.")
    try:
        await sess.client.disconnect()
    except Exception:
        pass
    await _set_account_auth_status(sess.account_id, "idle")
    logger.info("[auth] Cancelled login session for %s", phone)
    return {"ok": True, "phone": phone}


# ── GET /api/auth/sessions — introspect in-flight logins ─────────────────────

@auth_router.get("/sessions")
async def list_auth_sessions() -> dict:
    """Return metadata (no secrets) for all active in-flight login sessions."""
    now = time.monotonic()
    async with _clients_lock:
        sessions = [
            {
                "phone":        phone,
                "account_id":   s.account_id,
                "awaiting_2fa": s.awaiting_2fa,
                "age_seconds":  int(now - s.created_at),
                "proxy":        proxy_label(s.proxy_used) if s.proxy_used else None,
            }
            for phone, s in active_login_clients.items()
        ]
    return {"sessions": sessions, "count": len(sessions)}


# ═════════════════════════════════════════════════════════════════════════════
# Router: /api/metrics  — worker health, queue sizes, account status
# ═════════════════════════════════════════════════════════════════════════════

metrics_router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@metrics_router.get("/workers")
async def get_workers() -> dict:
    """
    All broadcast_workers rows enriched with live heartbeat age (seconds).
    Workers whose heartbeat_age_seconds > WORKER_DEAD_TIMEOUT are candidates
    for reaping via POST /api/metrics/reap.
    """
    workers = await get_worker_statuses(db_path=DB_PATH)
    now_dt  = datetime.now(timezone.utc)
    for w in workers:
        hb = (w.get("last_heartbeat") or "").replace("Z", "+00:00")
        try:
            w["heartbeat_age_seconds"] = int(
                (now_dt - datetime.fromisoformat(hb)).total_seconds()
            )
        except Exception:
            w["heartbeat_age_seconds"] = None
    return {"workers": workers, "count": len(workers)}


@metrics_router.get("/queue")
async def get_queue_stats() -> dict:
    """Task queue counters: pending / active / done / failed / dead / cancelled."""
    loop  = asyncio.get_event_loop()
    stats = await loop.run_in_executor(None, _tq().get_queue_stats_sync)
    return {"queue": stats}


@metrics_router.get("/accounts")
async def get_account_statuses() -> dict:
    """
    All sender_accounts rows — operational columns only (no credentials).
    Useful for diagnosing stuck broadcasts, proxy failures, and ban events.
    """
    def _sync() -> list[dict]:
        conn = _sq_conn(DB_PATH)
        rows = conn.execute("""
            SELECT id, phone, label, status, auth_status,
                   is_active, is_banned, locked_by, locked_at,
                   broadcasting, flood_wait_until, last_error,
                   proxy_index, current_proxy_index
            FROM sender_accounts
            ORDER BY id
        """).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    loop     = asyncio.get_event_loop()
    accounts = await loop.run_in_executor(None, _sync)
    return {"accounts": accounts, "count": len(accounts)}


@metrics_router.get("/tasks")
async def list_tasks_endpoint(
    status:      str | None = Query(None),
    campaign_id: int | None = Query(None),
    worker_id:   str | None = Query(None),
    limit:       int        = Query(50, le=500),
) -> dict:
    """List tasks with optional status / campaign_id / worker_id filters."""
    loop  = asyncio.get_event_loop()
    tasks = await loop.run_in_executor(
        None,
        lambda: _tq().list_tasks_sync(
            status=status,
            campaign_id=campaign_id,
            worker_id=worker_id,
            limit=limit,
        ),
    )
    return {"tasks": tasks, "count": len(tasks)}


@metrics_router.post("/reap")
async def reap_workers_endpoint(timeout: int = Query(90)) -> dict:
    """
    Manually trigger dead-worker reaping and stale-lock recovery.

    Calls reap_dead_workers() (marks stale broadcast_workers as 'dead' and
    runs force_release_worker_sync per dead worker) then recover_stale_locks_sync()
    as a belt-and-suspenders sweep.
    """
    reaped   = await reap_dead_workers(db_path=DB_PATH, timeout=timeout)
    loop     = asyncio.get_event_loop()
    released = await loop.run_in_executor(
        None, lambda: _tq().recover_stale_locks_sync(300)
    )
    return {"reaped_workers": reaped, "released_stale_locks": released}


# ═════════════════════════════════════════════════════════════════════════════
# Router: /api/campaigns  — manual broadcast triggers
# ═════════════════════════════════════════════════════════════════════════════

campaigns_router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


class TriggerRequest(BaseModel):
    priority:     int       = 5
    scheduled_at: str | None = None


@campaigns_router.post("/{campaign_id}/trigger")
async def trigger_campaign(
    campaign_id: int,
    req:         TriggerRequest = TriggerRequest(),
) -> dict:
    """
    Manually push one task to the queue for a group_campaigns row.

    The scheduler normally drives this automatically; this endpoint lets an
    operator or the Mini App trigger an immediate send outside the normal
    interval schedule.
    """
    def _sync() -> dict:
        try:
            conn = _sq_conn(DB_PATH)
            row  = conn.execute(
                "SELECT id, name, status, sender_account_id "
                "FROM group_campaigns WHERE id = ?",
                (campaign_id,),
            ).fetchone()
            conn.close()
        except sqlite3.OperationalError:
            return {"_error": f"campaign {campaign_id} not found", "_status": 404}
        if not row:
            return {"_error": f"campaign {campaign_id} not found", "_status": 404}
        if row["status"] not in ("running", "draft", "paused"):
            return {
                "_error": f"campaign status is '{row['status']}' — cannot trigger",
                "_status": 400,
            }
        task_id = _tq().push_sync(
            campaign_id=campaign_id,
            payload={"source": "manual_trigger"},
            priority=req.priority,
            scheduled_at=req.scheduled_at,
        )
        return {
            "ok":            True,
            "task_id":       task_id,
            "campaign_id":   campaign_id,
            "campaign_name": row["name"],
        }

    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _sync)
    if "_error" in result:
        raise HTTPException(result["_status"], detail=result["_error"])
    return result


@campaigns_router.post("/{campaign_id}/cancel-tasks")
async def cancel_campaign_tasks(campaign_id: int) -> dict:
    """Cancel all pending / claimed / failed tasks for *campaign_id*."""
    def _sync() -> dict:
        conn = _sq_conn(DB_PATH)
        rows = conn.execute(
            "SELECT id FROM tasks "
            "WHERE campaign_id = ? AND status IN ('pending','claimed','failed')",
            (campaign_id,),
        ).fetchall()
        conn.close()
        cancelled = sum(
            1 for r in rows
            if _tq().cancel_task_sync(r["id"], reason=f"admin cancel campaign {campaign_id}")
        )
        return {"ok": True, "cancelled": cancelled, "campaign_id": campaign_id}

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync)


@campaigns_router.get("/{campaign_id}/tasks")
async def get_campaign_tasks(
    campaign_id: int,
    limit:       int = Query(100, le=500),
) -> dict:
    """List all tasks for a specific campaign (newest first)."""
    loop  = asyncio.get_event_loop()
    tasks = await loop.run_in_executor(
        None,
        lambda: _tq().list_tasks_sync(campaign_id=campaign_id, limit=limit),
    )
    return {"tasks": tasks, "campaign_id": campaign_id, "count": len(tasks)}


# ═════════════════════════════════════════════════════════════════════════════
# Router: /api/admin  — maintenance operations
# ═════════════════════════════════════════════════════════════════════════════

admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


@admin_router.post("/recover-stale-locks")
async def recover_stale_locks(timeout_seconds: int = Query(300)) -> dict:
    """
    Release any sender_account whose lock has been held longer than
    *timeout_seconds*.  Also re-queues stuck 'claimed' tasks.
    """
    loop     = asyncio.get_event_loop()
    released = await loop.run_in_executor(
        None, lambda: _tq().recover_stale_locks_sync(timeout_seconds)
    )
    return {"released": released, "timeout_seconds": timeout_seconds}


@admin_router.post("/release-worker/{worker_id}")
async def release_worker(worker_id: str) -> dict:
    """
    Manually invoke force_release_worker_sync for *worker_id*.

    Releases all sender_accounts locked by that worker (auth_status → 'idle')
    and re-queues all 'claimed' tasks so they can be retried.
    """
    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, lambda: _tq().force_release_worker_sync(worker_id)
    )
    return {"ok": True, "worker_id": worker_id, **result}


@admin_router.post("/tasks/{task_id}/cancel")
async def cancel_task(
    task_id: int,
    reason:  str = Query("admin cancel"),
) -> dict:
    """Cancel a specific task by integer ID."""
    loop    = asyncio.get_event_loop()
    changed = await loop.run_in_executor(
        None, lambda: _tq().cancel_task_sync(task_id, reason)
    )
    if not changed:
        raise HTTPException(404, detail=f"Task {task_id} not found or already terminal.")
    return {"ok": True, "task_id": task_id}


@admin_router.get("/snapshot")
async def system_snapshot() -> dict:
    """
    Single endpoint returning a consolidated system snapshot:
      workers        — all broadcast_workers rows + heartbeat ages
      queue          — pending/active/done/failed/dead/cancelled counts
      accounts       — aggregated account health counters
      active_auth_sessions — in-flight login sessions (metadata only)

    Use this to build a monitoring dashboard with a single API call.
    """
    loop    = asyncio.get_event_loop()
    workers = await get_worker_statuses(db_path=DB_PATH)
    stats   = await loop.run_in_executor(None, _tq().get_queue_stats_sync)

    now_dt = datetime.now(timezone.utc)
    for w in workers:
        hb = (w.get("last_heartbeat") or "").replace("Z", "+00:00")
        try:
            w["heartbeat_age_seconds"] = int(
                (now_dt - datetime.fromisoformat(hb)).total_seconds()
            )
        except Exception:
            w["heartbeat_age_seconds"] = None

    now_mono = time.monotonic()
    async with _clients_lock:
        sessions = [
            {
                "phone":        phone,
                "account_id":   s.account_id,
                "awaiting_2fa": s.awaiting_2fa,
                "age_seconds":  int(now_mono - s.created_at),
            }
            for phone, s in active_login_clients.items()
        ]

    def _acct_summary() -> dict:
        conn = _sq_conn(DB_PATH)
        row  = conn.execute("""
            SELECT
                COUNT(*)                                              AS total,
                SUM(CASE WHEN is_active=1 AND is_banned=0 THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN is_banned=1                 THEN 1 ELSE 0 END) AS banned,
                SUM(CASE WHEN broadcasting=1              THEN 1 ELSE 0 END) AS broadcasting,
                SUM(CASE WHEN locked_by IS NOT NULL       THEN 1 ELSE 0 END) AS locked
            FROM sender_accounts
        """).fetchone()
        conn.close()
        return dict(row) if row else {}

    accts = await loop.run_in_executor(None, _acct_summary)

    return {
        "timestamp":              now_dt.isoformat(),
        "workers":                workers,
        "worker_count":           len(workers),
        "queue":                  stats,
        "accounts":               accts,
        "active_auth_sessions":   sessions,
    }


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    return {"ok": True, "service": "promo-fuel-apiserver", "port": API_PORT}


# ── Mount all routers ─────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(metrics_router)
app.include_router(campaigns_router)
app.include_router(admin_router)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )
    uvicorn.run(
        "apiserver:app",
        host="0.0.0.0",
        port=API_PORT,
        reload=False,
        log_level="info",
    )
