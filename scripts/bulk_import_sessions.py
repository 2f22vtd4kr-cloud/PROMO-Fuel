#!/usr/bin/env python3
"""
Bulk session importer.

Reads .session + .json pairs from a ZIP archive, assigns SOCKS5 proxies
round-robin, writes .session files to sessions_dir, and upserts rows into
sender_accounts.

Usage:
    python3 bulk_import_sessions.py <zip_path> <sessions_dir> <db_path>
    (proxy list fed via stdin, one socks5:// URL per line)
"""
import sys
import os
import json
import zipfile
import sqlite3
import datetime

def main():
    if len(sys.argv) < 4:
        print(json.dumps({"status": "error", "message": "Usage: bulk_import_sessions.py <zip_path> <sessions_dir> <db_path>"}))
        sys.exit(1)

    zip_path     = sys.argv[1]
    sessions_dir = sys.argv[2]
    db_path      = sys.argv[3]
    raw_proxies  = sys.stdin.read()

    proxies = [
        line.strip()
        for line in raw_proxies.splitlines()
        if line.strip().lower().startswith("socks5://")
    ]
    if not proxies:
        print(json.dumps({
            "status": "error",
            "message": "Не знайдено жодного валідного SOCKS5 проксі. Кожен рядок має починатись з socks5://"
        }))
        sys.exit(0)

    os.makedirs(sessions_dir, exist_ok=True)

    con = sqlite3.connect(db_path)
    try:
        con.execute("ALTER TABLE sender_accounts ADD COLUMN two_factor_pass TEXT")
        con.commit()
    except Exception:
        pass
    con.close()

    saved   = 0
    skipped = 0
    errors  = []

    try:
        with zipfile.ZipFile(zip_path, "r") as archive:
            file_list = set(archive.namelist())
            sessions  = sorted(f for f in file_list if f.endswith(".session"))

            for idx, session_entry in enumerate(sessions):
                base_name  = session_entry.rsplit(".", 1)[0]
                json_entry = base_name + ".json"

                if json_entry not in file_list:
                    skipped += 1
                    continue

                try:
                    session_bytes = archive.read(session_entry)
                    json_data     = json.loads(archive.read(json_entry).decode("utf-8"))

                    phone   = str(json_data.get("phone") or os.path.basename(base_name))
                    two_fa  = (
                        json_data.get("two_factor_auth")
                        or json_data.get("password")
                        or json_data.get("2fa")
                    )
                    proxy_str = proxies[idx % len(proxies)]

                    safe_phone   = phone.lstrip("+").replace(" ", "").replace("-", "")
                    session_path = os.path.join(sessions_dir, f"{safe_phone}.session")
                    with open(session_path, "wb") as fh:
                        fh.write(session_bytes)

                    now = datetime.datetime.now().isoformat()
                    con = sqlite3.connect(db_path)
                    con.execute("""
                        INSERT INTO sender_accounts
                            (phone, proxy, session_file, two_factor_pass, status, created_at)
                        VALUES (?, ?, ?, ?, 'idle', ?)
                        ON CONFLICT(phone) DO UPDATE SET
                            proxy           = excluded.proxy,
                            session_file    = excluded.session_file,
                            two_factor_pass = excluded.two_factor_pass,
                            status          = 'idle'
                    """, (phone, proxy_str, session_path, two_fa, now))
                    con.commit()
                    con.close()
                    saved += 1

                except Exception as exc:
                    errors.append(f"{os.path.basename(base_name)}: {exc}")
                    skipped += 1

    except zipfile.BadZipFile:
        print(json.dumps({"status": "error", "message": "Пошкоджений або невалідний ZIP-архів"}))
        sys.exit(0)
    except Exception as exc:
        print(json.dumps({"status": "error", "message": str(exc)}))
        sys.exit(0)

    print(json.dumps({
        "status": "success",
        "data": {
            "total_extracted_sessions": saved + skipped,
            "total_valid_proxies_parsed": len(proxies),
            "saved": saved,
            "skipped": skipped,
            "errors": errors[:10],
            "message": f"Імпорт завершено. Збережено {saved} акаунтів, пропущено {skipped}."
        }
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
