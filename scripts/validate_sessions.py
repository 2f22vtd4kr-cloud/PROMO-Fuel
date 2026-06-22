#!/usr/bin/env python3
"""
Session validator — connects to Telegram with Telethon for each account,
marks status as 'authorized' or 'session_invalid' in the SQLite DB.

Usage: python3 scripts/validate_sessions.py <db_path> <id1> [id2 ...]
Output JSON: {"results": [{id, phone, status, display_name, error}]}
"""
import sys, json, asyncio, sqlite3
from pathlib import Path


async def check_account(row: dict) -> dict:
    from telethon import TelegramClient
    from telethon.errors import (
        AuthKeyError, SessionRevokedError, UserDeactivatedError,
        UserDeactivatedBanError, PhoneNumberBannedError,
    )

    session_path = (row.get("session_file") or "").strip()
    api_id  = row.get("api_id")  or 0
    api_hash = row.get("api_hash") or ""
    phone   = row.get("phone") or ""
    acc_id  = row["id"]

    if not session_path or not Path(session_path).exists():
        return {"id": acc_id, "phone": phone, "status": "session_invalid",
                "display_name": None, "error": "Session file not found"}

    if not api_id or not api_hash:
        return {"id": acc_id, "phone": phone, "status": "session_invalid",
                "display_name": None, "error": "Missing api_id / api_hash"}

    # Parse first SOCKS5 proxy
    proxy_arg = None
    raw_proxy = (row.get("proxy") or "").strip()
    if raw_proxy:
        first = next((l.strip() for l in raw_proxy.splitlines()
                      if l.strip().lower().startswith("socks5://")), None)
        if first:
            from urllib.parse import urlparse
            p = urlparse(first)
            proxy_arg = (2, p.hostname, p.port, True,
                         p.username or None, p.password or None)

    # Telethon wants the path WITHOUT .session extension
    sess = session_path
    if sess.endswith(".session"):
        sess = sess[:-8]

    client = TelegramClient(
        sess, int(api_id), api_hash,
        proxy=proxy_arg,
        timeout=15,
        connection_retries=1,
        retry_delay=2,
    )
    try:
        await asyncio.wait_for(client.connect(), timeout=18)
        if not await client.is_user_authorized():
            return {"id": acc_id, "phone": phone, "status": "session_invalid",
                    "display_name": None, "error": "Not authorized"}
        me = await asyncio.wait_for(client.get_me(), timeout=12)
        name = ((me.first_name or "") + " " + (me.last_name or "")).strip()
        return {"id": acc_id, "phone": phone, "status": "authorized",
                "display_name": name or None, "error": None}

    except (AuthKeyError, SessionRevokedError):
        return {"id": acc_id, "phone": phone, "status": "session_invalid",
                "display_name": None, "error": "Session revoked"}
    except (UserDeactivatedError, UserDeactivatedBanError, PhoneNumberBannedError) as e:
        return {"id": acc_id, "phone": phone, "status": "banned",
                "display_name": None, "error": str(e)}
    except asyncio.TimeoutError:
        return {"id": acc_id, "phone": phone, "status": "session_invalid",
                "display_name": None, "error": "Connection timed out"}
    except Exception as e:
        return {"id": acc_id, "phone": phone, "status": "session_invalid",
                "display_name": None, "error": str(e)}
    finally:
        try:
            await asyncio.wait_for(client.disconnect(), timeout=5)
        except Exception:
            pass


async def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: validate_sessions.py <db_path> <id1> [id2 ...]"}))
        sys.exit(1)

    db_path = sys.argv[1]
    ids = [int(x) for x in sys.argv[2:] if x.strip().isdigit()]
    if not ids:
        print(json.dumps({"results": []}))
        return

    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    rows = []
    for aid in ids:
        row = con.execute(
            "SELECT id, phone, session_file, proxy, api_id, api_hash FROM sender_accounts WHERE id = ?",
            (aid,)
        ).fetchone()
        if row:
            rows.append(dict(row))
    con.close()

    results = []
    for row in rows:
        result = await check_account(row)
        results.append(result)

        # Write status back to DB
        new_status = result["status"]
        # Don't downgrade a banned account to session_invalid
        if new_status not in ("authorized", "banned", "session_invalid"):
            new_status = "session_invalid"
        update_fields = [f"status = '{new_status}'"]
        if result.get("display_name"):
            safe = result["display_name"].replace("'", "''")
            update_fields.append(f"label = CASE WHEN label = '' OR label IS NULL THEN '{safe}' ELSE label END")
        con = sqlite3.connect(db_path)
        con.execute(
            f"UPDATE sender_accounts SET {', '.join(update_fields)} WHERE id = ?",
            (row["id"],)
        )
        con.commit()
        con.close()

    print(json.dumps({"results": results}, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
