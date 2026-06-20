"""Proxy parser and per-account rotation logic.

Supports multiple proxy formats stored as JSON array in sender_accounts.proxies:
  - "socks5://user:pass@host:port"
  - "http://host:port"
  - { "scheme": "socks5", "host": "...", "port": 1080, "username": "...", "password": "..." }

Usage:
    proxies = parse_proxies(account.get("proxies") or account.get("proxy"))
    proxy   = pick_proxy(proxies, account_id=account["id"])
    client  = build_telethon_client(session, api_id, api_hash, proxy=proxy)
"""
import json
import logging
import random
import re
from typing import Any

logger = logging.getLogger(__name__)

# In-memory rotation index: account_id -> current_index
_rotation_index: dict[int, int] = {}


def parse_proxies(raw: Any) -> list[dict]:
    """Parse raw proxy field into a list of proxy dicts.

    Accepts:
      - None / ""          → []
      - "socks5://..."     → [parsed]
      - JSON array string  → [parsed, ...]
      - JSON object string → [parsed]
      - dict               → [dict]
      - list               → [parsed, ...]
    """
    if not raw:
        return []

    # If it's already a list or dict, normalize it
    if isinstance(raw, dict):
        return [_normalize(raw)]
    if isinstance(raw, list):
        return [_normalize(p) for p in raw if p]

    raw = str(raw).strip()
    if not raw:
        return []

    # Try JSON first
    if raw.startswith("[") or raw.startswith("{"):
        try:
            obj = json.loads(raw)
            if isinstance(obj, list):
                return [_normalize(p) for p in obj if p]
            if isinstance(obj, dict):
                return [_normalize(obj)]
        except json.JSONDecodeError:
            pass

    # Try URL format: scheme://[user:pass@]host:port
    return [_parse_url(raw)]


def _parse_url(url: str) -> dict:
    """Parse a proxy URL string into a dict Telethon can use."""
    url = url.strip()
    m = re.match(
        r"(?P<scheme>socks5|socks4|http|https)://"
        r"(?:(?P<username>[^:@]+):(?P<password>[^@]*)@)?"
        r"(?P<host>[^:]+):(?P<port>\d+)",
        url,
        re.IGNORECASE,
    )
    if not m:
        logger.warning(f"[proxy] Could not parse URL: {url!r}")
        return {}
    return {
        "scheme":   m.group("scheme").lower(),
        "host":     m.group("host"),
        "port":     int(m.group("port")),
        "username": m.group("username"),
        "password": m.group("password"),
    }


def _normalize(raw: Any) -> dict:
    """Normalize a proxy entry (dict or URL string) to a consistent dict."""
    if isinstance(raw, str):
        return _parse_url(raw)
    if isinstance(raw, dict):
        return {
            "scheme":   str(raw.get("scheme", raw.get("type", "socks5"))).lower(),
            "host":     str(raw.get("host", raw.get("addr", ""))),
            "port":     int(raw.get("port", 1080)),
            "username": raw.get("username") or raw.get("user") or None,
            "password": raw.get("password") or raw.get("pass") or None,
        }
    return {}


def pick_proxy(proxies: list[dict], account_id: int = 0) -> dict | None:
    """Round-robin proxy selection for an account.

    Returns a proxy dict or None if the list is empty.
    """
    valid = [p for p in proxies if p.get("host")]
    if not valid:
        return None
    if len(valid) == 1:
        return valid[0]

    idx = _rotation_index.get(account_id, 0) % len(valid)
    _rotation_index[account_id] = (idx + 1) % len(valid)
    return valid[idx]


def pick_proxy_random(proxies: list[dict]) -> dict | None:
    """Random proxy selection (for non-deterministic failover)."""
    valid = [p for p in proxies if p.get("host")]
    return random.choice(valid) if valid else None


def proxy_to_telethon(proxy: dict | None) -> tuple | None:
    """Convert a proxy dict to Telethon's (scheme, host, port, True, user, pass) tuple."""
    if not proxy or not proxy.get("host"):
        return None
    scheme = proxy.get("scheme", "socks5").lower()
    host   = proxy["host"]
    port   = int(proxy.get("port", 1080))
    user   = proxy.get("username") or None
    pwd    = proxy.get("password") or None

    if scheme in ("socks5", "socks4"):
        import socks
        socks_type = socks.SOCKS5 if scheme == "socks5" else socks.SOCKS4
        return (socks_type, host, port, True, user, pwd)

    # HTTP proxy — Telethon accepts (ConnectionTcpMTProxyRandomizedIntermediate, ...) but
    # for simple HTTP we return None and log a warning.
    logger.warning(f"[proxy] HTTP proxy not natively supported by Telethon: {host}:{port}")
    return None


def proxy_label(proxy: dict | None) -> str:
    """Human-readable proxy description for logs."""
    if not proxy or not proxy.get("host"):
        return "no-proxy"
    scheme = proxy.get("scheme", "socks5")
    host   = proxy["host"]
    port   = proxy.get("port", "?")
    return f"{scheme}://{host}:{port}"
