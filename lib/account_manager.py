"""
lib/account_manager.py — Unified Account Manager

High-level interface for managing Telethon clients for all sender accounts:
loading sessions, health-checking, staggered batch group joining, and warmup.

Usage::

    from lib.account_manager import get_manager
    am = get_manager()

    accounts = am.get_all_accounts(status_filter="idle")
    result   = await am.health_check(account_id=42)
    summary  = await am.batch_join(
        groups=["@fuel_chat_ru", "@azs_talk"],
        account_ids=[1, 2, 3],
        stagger_seconds=(45, 90),
    )
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

DB_PATH     = os.getenv("DB_PATH",     "./data/campaigns.db")
SESSION_DIR = os.getenv("SESSION_DIR", "./sessions")


# ── DB helpers ────────────────────────────────────────────────────────────────

def _db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


# ── AccountManager ────────────────────────────────────────────────────────────

class AccountManager:
    """
    Unified manager for Telegram sender accounts.

    All Telethon clients are built on-demand and **not** cached — callers must
    call ``await client.disconnect()`` when done to avoid session leaks.

    Thread safety: read operations are safe to call from any thread.
    Async operations (``load_client``, ``health_check``, ``batch_join``)
    must be awaited inside an asyncio event loop.
    """

    # ── Account queries ────────────────────────────────────────────────────

    def get_all_accounts(
        self,
        status_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Return all sender_accounts rows as dicts.

        Args:
            status_filter: if given, only accounts whose ``status`` matches
                           are returned (e.g. ``"idle"``, ``"active"``,
                           ``"warmup"``, ``"banned"``).
        """
        conn = _db()
        try:
            if status_filter:
                rows = conn.execute(
                    "SELECT * FROM sender_accounts WHERE status = ? ORDER BY id",
                    (status_filter,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM sender_accounts ORDER BY id"
                ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_account(self, account_id: int) -> Optional[Dict[str, Any]]:
        """Return a single sender_accounts row, or None if not found."""
        conn = _db()
        try:
            row = conn.execute(
                "SELECT * FROM sender_accounts WHERE id = ?", (account_id,)
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def get_tags(self, account_id: int) -> List[str]:
        """Return the parsed tags list for an account."""
        account = self.get_account(account_id)
        if not account:
            return []
        try:
            return json.loads(account.get("tags") or "[]")
        except Exception:
            return []

    def set_tags(self, account_id: int, tags: List[str]) -> None:
        """Replace the tags list for an account."""
        conn = _db()
        try:
            conn.execute(
                "UPDATE sender_accounts SET tags = ? WHERE id = ?",
                (json.dumps(tags, ensure_ascii=False), account_id),
            )
            conn.commit()
        finally:
            conn.close()

    def _update_account(self, account_id: int, **fields: Any) -> None:
        if not fields:
            return
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        vals = list(fields.values()) + [account_id]
        conn = _db()
        try:
            conn.execute(
                f"UPDATE sender_accounts SET {set_clause} WHERE id = ?", vals
            )
            conn.commit()
        finally:
            conn.close()

    # ── Client lifecycle ───────────────────────────────────────────────────

    async def load_client(
        self,
        account_id: int,
        *,
        connect: bool = True,
    ) -> Optional[Any]:  # returns TelegramClient | None
        """
        Build (and optionally connect) a Telethon client for *account_id*.

        Returns ``None`` when:
        - the account doesn't exist in the DB,
        - required credentials (session_file, api_id, api_hash) are missing,
        - the .session file is absent from disk,
        - a connection error (auth revoked, account banned) occurs.

        **Callers MUST call** ``await client.disconnect()`` when done.
        """
        try:
            from telethon import TelegramClient
            from telethon.errors import AuthKeyError, UserDeactivatedBanError
        except ImportError:
            logger.error("[am] telethon not installed")
            return None

        account = self.get_account(account_id)
        if not account:
            logger.warning("[am] load_client: account %d not found", account_id)
            return None

        sess     = account.get("session_file") or ""
        api_id   = account.get("api_id")
        api_hash = account.get("api_hash")

        if not (sess and api_id and api_hash):
            logger.warning(
                "[am] load_client: account %d missing session/api credentials", account_id
            )
            return None

        sess_path = sess.removesuffix(".session") if sess.endswith(".session") else sess
        if not os.path.exists(sess_path + ".session"):
            logger.warning("[am] session file missing for account %d: %s.session", account_id, sess_path)
            return None

        # Build optional proxy config
        proxy_cfg: Any = None
        try:
            from utils.proxy import proxy_to_telethon
            proxies = json.loads(account.get("proxies") or "[]")
            idx     = int(account.get("current_proxy_index") or 0)
            if proxies:
                proxy_cfg = proxy_to_telethon(proxies[idx % len(proxies)])
        except Exception as exc:
            logger.debug("[am] proxy build skipped for account %d: %s", account_id, exc)

        client = TelegramClient(sess_path, int(api_id), api_hash, proxy=proxy_cfg)

        if not connect:
            return client

        try:
            await client.connect()
        except (AuthKeyError, UserDeactivatedBanError) as exc:
            logger.warning("[am] account %d auth/ban error: %s", account_id, exc)
            await client.disconnect()
            return None
        except Exception as exc:
            logger.warning("[am] account %d connect failed: %s", account_id, exc)
            await client.disconnect()
            return None

        return client

    # ── Health check ───────────────────────────────────────────────────────

    async def health_check(self, account_id: int) -> Dict[str, Any]:
        """
        Validate an account session with a lightweight ``get_me()`` call.

        Updates ``sender_accounts.health_score`` and ``last_used_at`` on success;
        marks ``status = 'banned'`` + ``health_score = 0.0`` on auth failures.

        Returns a result dict::

            {
                "ok": bool,
                "account_id": int,
                "user": {"id": int, "username": str, "first_name": str},   # only on success
                "error": str,   # only on failure
            }
        """
        try:
            from telethon.errors import AuthKeyError, UserDeactivatedBanError
        except ImportError:
            return {"ok": False, "account_id": account_id, "error": "telethon_missing"}

        client = await self.load_client(account_id)
        if client is None:
            return {"ok": False, "account_id": account_id, "error": "session_missing_or_unavailable"}

        try:
            me = await client.get_me()
            if me is None:
                self._update_account(account_id, status="session_invalid", health_score=0.5)
                return {"ok": False, "account_id": account_id, "error": "get_me_returned_none"}

            self._update_account(
                account_id,
                health_score=1.0,
                last_used_at=datetime.now(timezone.utc).isoformat(),
            )
            return {
                "ok": True,
                "account_id": account_id,
                "user": {
                    "id":         me.id,
                    "username":   getattr(me, "username", None),
                    "first_name": getattr(me, "first_name", ""),
                },
            }
        except (AuthKeyError, UserDeactivatedBanError) as exc:
            self._update_account(account_id, status="banned", health_score=0.0, is_banned=1)
            return {"ok": False, "account_id": account_id, "error": f"banned: {exc}"}
        except Exception as exc:
            return {"ok": False, "account_id": account_id, "error": str(exc)}
        finally:
            try:
                await client.disconnect()
            except Exception:
                pass

    async def health_check_all(
        self,
        status_filter: Optional[str] = "idle",
        *,
        concurrency: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Run health_check for every matching account with controlled concurrency.

        Args:
            status_filter: pass None to check ALL accounts.
            concurrency:   max simultaneous Telethon connections.
        """
        accounts = self.get_all_accounts(status_filter)
        sem      = asyncio.Semaphore(concurrency)
        results: List[Dict[str, Any]] = []

        async def _check(acc: Dict[str, Any]) -> None:
            async with sem:
                res = await self.health_check(acc["id"])
                results.append(res)

        await asyncio.gather(*[_check(a) for a in accounts])
        return results

    # ── Batch group join ───────────────────────────────────────────────────

    async def batch_join(
        self,
        groups: List[str],
        account_ids: List[int],
        *,
        stagger_seconds: Tuple[int, int] = (30, 120),
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """
        Join *groups* with multiple accounts using human-paced staggered delays.

        Each ``(account, group)`` pair is attempted one at a time, with a random
        delay between ``stagger_seconds[0]`` and ``stagger_seconds[1]`` seconds
        separating each attempt.  This mimics organic join patterns and reduces
        the risk of platform rate-limits.

        Args:
            groups:          group usernames (e.g. ``"@fuel_chat"``) or invite links.
            account_ids:     IDs of sender_accounts to use.
            stagger_seconds: ``(min_secs, max_secs)`` delay range.
            dry_run:         log intent but skip actual Telegram calls.

        Returns a summary::

            {
                "total":   int,   # account × group pairs attempted
                "success": int,
                "skipped": int,   # already a member / dry_run
                "failed":  int,
                "details": [...], # per-(account, group) result dict
            }
        """
        try:
            from telethon.errors import FloodWaitError, UserAlreadyParticipantError
            from telethon.tl.functions.channels import JoinChannelRequest
        except ImportError:
            return {"ok": False, "error": "telethon_missing"}

        results: Dict[str, Any] = {
            "total":   len(account_ids) * len(groups),
            "success": 0,
            "skipped": 0,
            "failed":  0,
            "details": [],
        }

        for account_id in account_ids:
            account = self.get_account(account_id)
            phone   = account.get("phone", f"#{account_id}") if account else f"#{account_id}"

            for group in groups:
                entry: Dict[str, Any] = {
                    "account_id": account_id,
                    "phone":      phone,
                    "group":      group,
                    "status":     "pending",
                }

                if dry_run:
                    entry["status"] = "dry_run"
                    results["skipped"] += 1
                    results["details"].append(entry)
                    continue

                client = await self.load_client(account_id)
                if client is None:
                    entry["status"] = "no_client"
                    entry["error"]  = "session unavailable"
                    results["failed"] += 1
                    results["details"].append(entry)
                    continue

                try:
                    await client(JoinChannelRequest(group))
                    entry["status"] = "joined"
                    results["success"] += 1
                    logger.info("[am] batch_join: account=%d joined %s", account_id, group)
                    self._update_account(
                        account_id, last_used_at=datetime.now(timezone.utc).isoformat()
                    )
                except UserAlreadyParticipantError:
                    entry["status"] = "already_member"
                    results["skipped"] += 1
                except FloodWaitError as fwe:
                    entry["status"]       = "flood_wait"
                    entry["wait_seconds"] = fwe.seconds
                    results["failed"]    += 1
                    logger.warning(
                        "[am] batch_join: account=%d flood_wait=%ds on %s",
                        account_id, fwe.seconds, group,
                    )
                except Exception as exc:
                    entry["status"] = "error"
                    entry["error"]  = str(exc)
                    results["failed"] += 1
                    logger.warning("[am] batch_join: account=%d join %s failed: %s", account_id, group, exc)
                finally:
                    try:
                        await client.disconnect()
                    except Exception:
                        pass

                results["details"].append(entry)

                # Human-paced stagger between each join attempt
                if account_ids[-1] != account_id or groups[-1] != group:
                    delay = random.uniform(*stagger_seconds)
                    logger.debug("[am] batch_join stagger %.1fs before next attempt", delay)
                    await asyncio.sleep(delay)

        return results

    # ── Warmup ─────────────────────────────────────────────────────────────

    def warmup_account(self, account_id: int) -> bool:
        """
        Queue an account for organic warmup messaging.

        Delegates to ``utils.account_warmer.start_warmup_task``.
        Returns True if the warmup task was queued, False otherwise.
        """
        try:
            from utils.account_warmer import start_warmup_task
            return start_warmup_task(account_id)
        except Exception as exc:
            logger.error("[am] warmup_account %d failed: %s", account_id, exc)
            return False

    def warmup_status(self, account_id: int) -> Dict[str, Any]:
        """Return warmup fields for an account."""
        try:
            from utils.account_warmer import is_warmup_running
            account = self.get_account(account_id)
            if not account:
                return {"ok": False, "error": "account_not_found"}
            running = is_warmup_running(account_id)
            return {
                "ok":          True,
                "account_id":  account_id,
                "running":     running,
                "status":      account.get("warmup_status", "none"),
                "sent":        account.get("warmup_messages_sent", 0),
                "target":      account.get("warmup_target", 10),
                "started_at":  account.get("warmup_started_at"),
                "completed_at": account.get("warmup_completed_at"),
            }
        except Exception as exc:
            return {"ok": False, "error": str(exc)}


# ── Module-level singleton ────────────────────────────────────────────────────

_manager: Optional[AccountManager] = None


def get_manager() -> AccountManager:
    """Return the module-level AccountManager singleton (lazy-initialised)."""
    global _manager
    if _manager is None:
        _manager = AccountManager()
    return _manager
