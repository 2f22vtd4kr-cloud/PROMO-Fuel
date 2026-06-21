"""Proxy parser, async rotation engine, and connectivity validator.

Supports proxy entries stored as a JSON array in sender_accounts.proxies:
  - URL strings:  "socks5://user:pass@host:port"  /  "http://host:port"
  - Dicts:        {"scheme": "socks5", "host": "...", "port": 1080, ...}

Public API (backward-compatible)
---------------------------------
parse_proxies(raw)               -> list[dict]
pick_proxy(proxies, account_id)  -> dict | None
proxy_to_telethon(proxy)         -> tuple | None
proxy_label(proxy)               -> str

Async API (new)
---------------------------------
rotate_on_error(account_id, proxies, db_path, *, failed_label)  -> dict | None
validate_proxy(proxy, timeout, judge_url)                        -> bool
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import sqlite3
import time
from typing import Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("DB_PATH", "campaigns.db")

# ── In-process per-proxy failure tracking ────────────────────────────────────
# Maps proxy_label -> (consecutive_failures, last_failure_monotonic_time)
_proxy_failures: dict[str, tuple[int, float]] = {}
_FAIL_WINDOW    = 300  # seconds — stale failure records reset after this period
_FAIL_THRESHOLD = 3    # skip proxy after this many failures within the window

# Public judge endpoint: any HTTP service that returns 200 is acceptable.
_JUDGE_URL     = "http://httpbin.org/ip"
_JUDGE_TIMEOUT = 10.0  # seconds


# ─────────────────────────────────────────────────────────────────────────────
# Parsing helpers
# ─────────────────────────────────────────────────────────────────────────────

def parse_proxies(raw: Any) -> list[dict]:
    """Parse the raw proxy field from the database into normalised proxy dicts.

    Accepts any of:
      - None / ""            -> []
      - "socks5://..."       -> [parsed dict]
      - JSON array string    -> [parsed dict, ...]
      - JSON object string   -> [parsed dict]
      - list of str/dicts    -> [parsed dict, ...]
      - bare dict            -> [normalised dict]
    """
    if not raw:
        return []

    if isinstance(raw, dict):
        return [_normalise(raw)]
    if isinstance(raw, list):
        return [_normalise(p) for p in raw if p]

    raw = str(raw).strip()
    if not raw:
        return []

    if raw.startswith(("[", "{")):
        try:
            obj = json.loads(raw)
            if isinstance(obj, list):
                return [_normalise(p) for p in obj if p]
            if isinstance(obj, dict):
                return [_normalise(obj)]
        except json.JSONDecodeError:
            pass

    return [_parse_url(raw)]


def _parse_url(url: str) -> dict:
    """Parse a proxy URL string into a normalised proxy dict."""
    url = url.strip()
    m = re.match(
        r"(?P<scheme>socks5|socks4|http|https)://"
        r"(?:(?P<username>[^:@]+):(?P<password>[^@]*)@)?"
        r"(?P<host>[^:/]+):(?P<port>\d+)",
        url,
        re.IGNORECASE,
    )
    if not m:
        logger.warning("[proxy] Cannot parse URL: %r", url)
        return {}
    return {
        "scheme":   m.group("scheme").lower(),
        "host":     m.group("host").strip(),
        "port":     int(m.group("port")),
        "username": m.group("username") or None,
        "password": m.group("password") or None,
    }


def _normalise(raw: Any) -> dict:
    """Normalise any proxy representation to a consistent dict."""
    if isinstance(raw, str):
        return _parse_url(raw)
    if isinstance(raw, dict):
        return {
            "scheme":   str(raw.get("scheme") or raw.get("type") or "socks5").lower(),
            "host":     str(raw.get("host")   or raw.get("addr") or "").strip(),
            "port":     int(raw.get("port", 1080)),
            "username": raw.get("username") or raw.get("user") or None,
            "password": raw.get("password") or raw.get("pass") or None,
        }
    return {}


# ─────────────────────────────────────────────────────────────────────────────
# Synchronous selection helpers (backward-compatible)
# ─────────────────────────────────────────────────────────────────────────────

def pick_proxy(proxies: list[dict], account_id: int = 0) -> dict | None:
    """Return the first valid proxy in the list.

    Callers that need error-driven rotation should use rotate_on_error() instead.
    Returns None if the list is empty or contains no entries with a host.
    """
    valid = [p for p in proxies if p.get("host")]
    return valid[0] if valid else None


def proxy_label(proxy: dict | None) -> str:
    """Human-readable proxy identifier for log messages."""
    if not proxy or not proxy.get("host"):
        return "no-proxy"
    scheme = proxy.get("scheme", "socks5")
    host   = proxy["host"]
    port   = proxy.get("port", "?")
    user   = proxy.get("username")
    suffix = f"({user})" if user else ""
    return f"{scheme}://{host}:{port}{suffix}"


def proxy_to_telethon(proxy: dict | None) -> tuple | None:
    """Convert a proxy dict to the tuple Telethon's TelegramClient expects.

    Format: (socks_type, host, port, rdns_flag, username, password)

    Returns None for HTTP proxies (not natively supported by MTProto transport)
    or when no proxy is configured.
    """
    if not proxy or not proxy.get("host"):
        return None

    scheme = proxy.get("scheme", "socks5").lower()
    host   = proxy["host"]
    port   = int(proxy.get("port", 1080))
    user   = proxy.get("username") or None
    pwd    = proxy.get("password") or None

    if scheme in ("socks5", "socks4"):
        try:
            import socks  # PySocks — bundled with python-telegram-bot extras
            socks_type = socks.SOCKS5 if scheme == "socks5" else socks.SOCKS4
            return (socks_type, host, port, True, user, pwd)
        except ImportError:
            logger.error(
                "[proxy] PySocks not installed — cannot build Telethon proxy tuple"
            )
            return None

    logger.warning(
        "[proxy] HTTP/HTTPS proxies are not natively supported by Telethon: %s:%s",
        host, port,
    )
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Async rotation engine
# ─────────────────────────────────────────────────────────────────────────────

async def rotate_on_error(
    account_id: int,
    proxies: list[dict],
    db_path: str = DB_PATH,
    *,
    failed_label: str | None = None,
) -> dict | None:
    """Advance the proxy rotation index when a connection error occurs.

    Algorithm
    ---------
    1. Record a failure hit against *failed_label* in the in-process tracker.
    2. Read the account's current_proxy_index from sender_accounts.
    3. Walk the proxy list from the next position, skipping any proxy whose
       in-process failure count has reached _FAIL_THRESHOLD within _FAIL_WINDOW.
    4. If all proxies are exhausted, clear failure records and wrap around
       (gives the pool a second chance rather than permanently blocking sends).
    5. Persist the chosen new index to both current_proxy_index and proxy_index
       columns so every worker process sees the same position.
    6. Return the selected proxy dict, or None if the list is empty.

    Args:
        account_id:   Primary key of the sender_accounts row.
        proxies:      Already-parsed proxy list (output of parse_proxies()).
        db_path:      Path to campaigns.db.
        failed_label: proxy_label() of the proxy that just failed.
                      When provided its failure counter is bumped before rotation.
    """
    valid = [p for p in proxies if p.get("host")]
    if not valid:
        logger.warning(
            "[proxy] account=%s has no configured proxies — cannot rotate",
            account_id,
        )
        return None

    # Step 1: record failure for the outgoing proxy
    if failed_label and failed_label != "no-proxy":
        _record_failure(failed_label)

    # Step 2: read current index from DB (async, run in thread executor)
    current_index = await _db_read_proxy_index(account_id, db_path)
    n = len(valid)

    # Step 3: find the next healthy candidate
    chosen_index: int | None = None
    for offset in range(1, n + 1):
        candidate_index = (current_index + offset) % n
        candidate       = valid[candidate_index]
        label           = proxy_label(candidate)

        fail_count, last_fail_ts = _proxy_failures.get(label, (0, 0.0))
        age = time.monotonic() - last_fail_ts
        if age > _FAIL_WINDOW:
            # Stale record — reset and treat as healthy
            _proxy_failures.pop(label, None)
            fail_count = 0

        if fail_count < _FAIL_THRESHOLD:
            chosen_index = candidate_index
            break

    # Step 4: all proxies exhausted — clear counters and wrap to next
    if chosen_index is None:
        logger.warning(
            "[proxy] account=%s — all %d proxies exhausted; resetting failure counters",
            account_id, n,
        )
        _proxy_failures.clear()
        chosen_index = (current_index + 1) % n

    chosen_proxy = valid[chosen_index]

    # Step 5: persist new index
    await _db_write_proxy_index(account_id, chosen_index, db_path)

    logger.info(
        "[proxy] account=%s rotated index %d → %d  (%s)",
        account_id, current_index, chosen_index, proxy_label(chosen_proxy),
    )
    return chosen_proxy


def _record_failure(label: str) -> None:
    """Increment the in-process failure counter for a proxy."""
    count, _ = _proxy_failures.get(label, (0, 0.0))
    _proxy_failures[label] = (count + 1, time.monotonic())
    logger.debug("[proxy] failure #%d recorded for %s", count + 1, label)


async def _db_read_proxy_index(account_id: int, db_path: str) -> int:
    """Read current_proxy_index from sender_accounts (falls back to proxy_index)."""
    def _sync() -> int:
        try:
            conn = sqlite3.connect(db_path, timeout=10)
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA busy_timeout=10000")
            row = conn.execute(
                "SELECT current_proxy_index, proxy_index "
                "FROM sender_accounts WHERE id = ?",
                (account_id,),
            ).fetchone()
            conn.close()
            if row:
                return int(row[0] if row[0] is not None else (row[1] or 0))
        except Exception as exc:
            logger.debug("[proxy] DB read index failed: %s", exc)
        return 0

    return await asyncio.get_event_loop().run_in_executor(None, _sync)


async def _db_write_proxy_index(account_id: int, index: int, db_path: str) -> None:
    """Persist the new rotation index to both current_proxy_index and proxy_index."""
    def _sync() -> None:
        try:
            conn = sqlite3.connect(db_path, timeout=10)
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA busy_timeout=10000")
            conn.execute(
                "UPDATE sender_accounts "
                "SET current_proxy_index = ?, proxy_index = ? "
                "WHERE id = ?",
                (index, index, account_id),
            )
            conn.commit()
            conn.close()
        except Exception as exc:
            logger.warning(
                "[proxy] DB write index failed for account=%s: %s", account_id, exc
            )

    await asyncio.get_event_loop().run_in_executor(None, _sync)


# ─────────────────────────────────────────────────────────────────────────────
# Proxy connectivity validator
# ─────────────────────────────────────────────────────────────────────────────

async def validate_proxy(
    proxy: dict | None,
    timeout: float = _JUDGE_TIMEOUT,
    judge_url: str = _JUDGE_URL,
) -> bool:
    """Verify that *proxy* can reach the public internet through a judge endpoint.

    Validation is three-tier, each tier only runs if the previous passed:

    Tier 1 — TCP reachability
        Open a raw TCP connection to proxy host:port.  Fails fast for dead IPs
        and firewalled ports without sending any application data.

    Tier 2 — Protocol handshake
        For SOCKS5: complete the RFC 1928 greeting to verify a real SOCKS5 server
        is listening (not just any open TCP port).
        For HTTP: send a CONNECT probe and check the 200 reply.

    Tier 3 — End-to-end HTTP judge
        Route an HTTP GET to *judge_url* through the proxy using raw asyncio byte
        streams.  A 2xx response confirms the proxy can actually forward traffic.
        No third-party libraries (aiohttp-socks, httpx, etc.) are required.

    Returns True when all applicable tiers pass, False on any failure.
    Proxies configured as None / empty are treated as "direct connect" → True.
    """
    if not proxy or not proxy.get("host"):
        logger.debug("[proxy:validate] no proxy configured — treating as valid")
        return True

    host   = proxy["host"]
    port   = int(proxy.get("port", 1080))
    scheme = proxy.get("scheme", "socks5").lower()
    label  = proxy_label(proxy)

    logger.debug("[proxy:validate] checking %s  via %s", label, judge_url)

    # ── Tier 1: TCP connectivity ──────────────────────────────────────────────
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=timeout,
        )
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
    except (OSError, asyncio.TimeoutError) as exc:
        logger.warning("[proxy:validate] ✗ TCP unreachable %s — %s", label, exc)
        return False

    logger.debug("[proxy:validate] Tier 1 TCP OK  %s", label)

    # ── Tier 2: protocol handshake ────────────────────────────────────────────
    if scheme == "socks5":
        if not await _socks5_probe(host, port, timeout):
            logger.warning("[proxy:validate] ✗ SOCKS5 handshake failed  %s", label)
            return False
        logger.debug("[proxy:validate] Tier 2 SOCKS5 handshake OK  %s", label)

    # ── Tier 3: HTTP judge through the proxy ──────────────────────────────────
    try:
        ok = await _http_via_proxy(proxy, judge_url, timeout)
    except Exception as exc:
        logger.warning("[proxy:validate] ✗ Judge request error  %s — %s", label, exc)
        return False

    if ok:
        logger.info("[proxy:validate] ✓ %s is healthy  (%s)", label, judge_url)
    else:
        logger.warning("[proxy:validate] ✗ Judge returned non-2xx via %s", label)

    return ok


async def _socks5_probe(host: str, port: int, timeout: float) -> bool:
    """Complete a minimal SOCKS5 greeting to verify the server is SOCKS5-compliant.

    RFC 1928 §3 exchange:
        Client  →  [0x05, 0x01, 0x00]   (VER=5, NMETHODS=1, METHOD=NO_AUTH)
        Server  ←  [0x05, <method>]     (VER=5, chosen method — 0xFF = rejected)
    """
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=timeout,
        )
        writer.write(b"\x05\x01\x00")
        await writer.drain()
        resp = await asyncio.wait_for(reader.read(2), timeout=timeout)
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return len(resp) == 2 and resp[0] == 0x05 and resp[1] != 0xFF
    except Exception:
        return False


async def _http_via_proxy(proxy: dict, url: str, timeout: float) -> bool:
    """Route an HTTP GET to *url* through *proxy* using raw asyncio streams.

    Supports SOCKS5 (with and without credentials) and HTTP CONNECT tunnels.
    Returns True when the upstream status line contains "HTTP/1" and " 2"
    (i.e., any 2xx response), False otherwise.
    """
    scheme   = proxy.get("scheme", "socks5").lower()
    p_host   = proxy["host"]
    p_port   = int(proxy.get("port", 1080))
    username = proxy.get("username")
    password = proxy.get("password")

    parsed   = urlparse(url)
    dst_host = parsed.hostname or "httpbin.org"
    dst_port = parsed.port or 80
    dst_path = (parsed.path or "/") + (f"?{parsed.query}" if parsed.query else "")

    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(p_host, p_port),
            timeout=timeout,
        )
    except Exception:
        return False

    try:
        # ── Establish tunnel through the proxy ────────────────────────────────
        if scheme == "socks5":
            if not await _socks5_connect_to(
                reader, writer, dst_host, dst_port, username, password, timeout
            ):
                return False

        elif scheme in ("http", "https"):
            # HTTP CONNECT tunnel
            import base64
            connect_line = f"CONNECT {dst_host}:{dst_port} HTTP/1.1\r\nHost: {dst_host}:{dst_port}\r\n"
            if username and password:
                creds = base64.b64encode(f"{username}:{password}".encode()).decode()
                connect_line += f"Proxy-Authorization: Basic {creds}\r\n"
            connect_line += "\r\n"
            writer.write(connect_line.encode())
            await writer.drain()

            status = await asyncio.wait_for(reader.readline(), timeout=timeout)
            if b"200" not in status:
                return False
            # Drain response headers
            while True:
                line = await asyncio.wait_for(reader.readline(), timeout=timeout)
                if line in (b"\r\n", b"\n", b""):
                    break
        else:
            return False

        # ── Send HTTP GET through the established tunnel ───────────────────────
        request = (
            f"GET {dst_path} HTTP/1.1\r\n"
            f"Host: {dst_host}\r\n"
            f"Connection: close\r\n"
            f"User-Agent: PromoFuelProxyValidator/1.0\r\n"
            f"\r\n"
        )
        writer.write(request.encode())
        await writer.drain()

        status_line = await asyncio.wait_for(reader.readline(), timeout=timeout)
        return b"HTTP/1" in status_line and b" 2" in status_line

    except Exception as exc:
        logger.debug("[proxy:validate] _http_via_proxy inner error: %s", exc)
        return False
    finally:
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass


async def _socks5_connect_to(
    reader: asyncio.StreamReader,
    writer: asyncio.StreamWriter,
    dst_host: str,
    dst_port: int,
    username: str | None,
    password: str | None,
    timeout: float,
) -> bool:
    """Execute the full SOCKS5 handshake + CONNECT command to (dst_host, dst_port).

    Handles NO_AUTH (0x00) and USERNAME/PASSWORD (0x02) sub-negotiation per
    RFC 1928 and RFC 1929.  Returns True on success, False on any protocol error.
    """
    has_creds = bool(username and password)

    # ── Greeting: offer supported auth methods ────────────────────────────────
    greeting = b"\x05\x02\x00\x02" if has_creds else b"\x05\x01\x00"
    writer.write(greeting)
    await writer.drain()

    choice = await asyncio.wait_for(reader.read(2), timeout=timeout)
    if len(choice) < 2 or choice[0] != 0x05 or choice[1] == 0xFF:
        logger.debug("[proxy:socks5] server rejected all auth methods")
        return False

    # ── Username/password sub-negotiation (RFC 1929) ──────────────────────────
    if choice[1] == 0x02:
        if not has_creds:
            logger.debug("[proxy:socks5] server requires auth but no creds supplied")
            return False
        u_enc = (username or "").encode()
        p_enc = (password or "").encode()
        auth  = bytes([0x01, len(u_enc)]) + u_enc + bytes([len(p_enc)]) + p_enc
        writer.write(auth)
        await writer.drain()
        auth_resp = await asyncio.wait_for(reader.read(2), timeout=timeout)
        if len(auth_resp) < 2 or auth_resp[1] != 0x00:
            logger.debug("[proxy:socks5] authentication rejected by server")
            return False

    # ── CONNECT command (ATYP=0x03: domain name) ─────────────────────────────
    host_enc   = dst_host.encode()
    port_bytes = dst_port.to_bytes(2, "big")
    cmd = (
        b"\x05\x01\x00\x03"        # VER=5, CMD=CONNECT, RSV=0, ATYP=DOMAINNAME
        + bytes([len(host_enc)])
        + host_enc
        + port_bytes
    )
    writer.write(cmd)
    await writer.drain()

    # Read the minimum 4-byte reply header
    resp = await asyncio.wait_for(reader.read(4), timeout=timeout)
    if len(resp) < 4 or resp[0] != 0x05 or resp[1] != 0x00:
        logger.debug(
            "[proxy:socks5] CONNECT failed — reply code 0x%02x",
            resp[1] if len(resp) > 1 else 0xFF,
        )
        return False

    # Drain the bound-address portion of the reply so the stream is clean
    atyp = resp[3]
    if atyp == 0x01:    # IPv4: 4 bytes + 2 port
        await asyncio.wait_for(reader.read(6), timeout=timeout)
    elif atyp == 0x03:  # Domain: 1 length byte + N bytes + 2 port
        length = (await asyncio.wait_for(reader.read(1), timeout=timeout))[0]
        await asyncio.wait_for(reader.read(length + 2), timeout=timeout)
    elif atyp == 0x04:  # IPv6: 16 bytes + 2 port
        await asyncio.wait_for(reader.read(18), timeout=timeout)

    return True
