# PROMO-Fuel CRM — Full Fix & Cleanup Prompt for Replit Agent

## CONTEXT
This is a Telegram CRM Mini App (PROMO-Fuel) for a fuel station business. It runs on:
- **Backend**: Python (`main.py`, `campaign_db.py`, `campaign_sender.py`) using `python-telegram-bot` + `telethon` + `aiosqlite`
- **Frontend**: TypeScript/React served at `/crm-platform/` via the `lib/` directory
- **DB**: SQLite (`campaigns.db`) + JSON sidecar (`bot_db.json`)

The UI has 6 tabs: ГЛАВНАЯ, РАССЫЛКИ, АНАЛИТИКА, АУДИТОРИЯ, АККАУНТЫ, ФАЙЛЫ.

---

## PROBLEM SUMMARY (fix ALL of these)

### 1. DATABASE CLEANUP — wipe all seed/fake data
- Open `campaigns.db` and **DELETE all rows** from `campaigns`, `sends`, `users`, and `sender_accounts` tables (the DB is full of design-sheet dummy data like "АИ-92 скидка — выходные", "АИ-98 только для VIP", fake send counts like 3.1K, etc.)
- Do this via a Python migration script `scripts/reset_db.py` that can be run once: it drops all rows but keeps the schema intact.
- Also **clear `bot_db.json`** — set it to `{}`.
- After the wipe, the dashboard stats (ГЛАВНАЯ) must show real zeros: 0 sent, 0 active campaigns, 0 users, 0% open rate.

### 2. PASSWORD PAGE — fix "requires reload after entering password"
- In the frontend password gate component, after a successful password submission the redirect/state change must happen **without requiring a manual page reload**.
- Fix: after correct password entry, update app state (`isAuthenticated = true`) immediately in the same React render cycle — do NOT use `window.location.reload()`. Use `useState` + conditional rendering of the main app vs. the password screen.

### 3. ALL BUTTONS NOT WORKING — wire every button to real API endpoints
Create/fix the following REST API routes in the Python backend (add them to `main.py` or a new `api.py` served alongside the bot using FastAPI or Flask on a separate port, or use the existing Express/Vite dev server proxy in the `lib/` folder — check how the existing API routes are defined and follow the same pattern):

**ГЛАВНАЯ (Dashboard)**
- Stats cards must call `GET /api/stats` → return `{ sent_today, active_campaigns, total_users, open_rate }` computed from real DB data
- "Новая рассылка" button → navigate to РАССЫЛКИ tab and open the create-campaign form
- "Статистика", "Аудитория", "Аккаунты" quick-action buttons → navigate to the respective tabs
- "Активные кампании" section → call `GET /api/campaigns?status=running` and render real data

**РАССЫЛКИ (Campaigns)**
- List must call `GET /api/campaigns` → return all campaigns from `campaigns` table ordered by `created_at DESC`
- Each campaign card must show real status badge, real sent/total counts, real date
- ▶️ Play button on a paused campaign → `POST /api/campaigns/:id/resume`
- ⏸ Pause button on a running campaign → `POST /api/campaigns/:id/pause`
- 🗑 **DELETE button (NEW — add this)**: each campaign card must have a trash/delete icon button → calls `DELETE /api/campaigns/:id`. Only allowed when status is NOT `running`. Show a confirmation dialog before deletion. After deletion, refresh the list.
- "Новая рассылка" / "+ Создать кампанию" button → open a form/modal with fields: Name, Message text (textarea), Target audience (all / by tag), Schedule (now / datetime picker). On submit → `POST /api/campaigns` with `{ name, text, tag?, scheduled_at? }` → creates campaign with status `draft` or `scheduled`

**АНАЛИТИКА (Analytics)**
- Call `GET /api/analytics` → return aggregated data: sends per day (last 14 days), top campaigns by open rate, total users over time
- Render real charts from this data (use recharts or chart.js — check what's already imported)
- If no data yet, show empty state "Нет данных для отображения"

**АУДИТОРИЯ (Audience)**
- Stats cards (active/new/inactive/vip) must call `GET /api/audience/stats`
- User list must call `GET /api/audience/users?limit=20&offset=0`
- Compute active/inactive/new based on `last_seen` and `first_seen` timestamps from the `users` table (active = seen in last 30 days, new = first_seen in last 7 days, vip = has tag "vip")
- Each user row must show real `username`, `first_seen` date, and status badge
- Clicking a user row → show a detail panel with their tags and send history

**АККАУНТЫ (Sender Accounts)**
- List must call `GET /api/accounts` → return rows from `sender_accounts`
- "Добавить аккаунт" button → form with phone number input → `POST /api/accounts` → insert into `sender_accounts` and trigger Telethon auth flow for that phone
- Each account row must show real label, phone, status, sent_today, is_banned
- Toggle active/inactive → `PATCH /api/accounts/:id` with `{ is_active: true/false }`

**ФАЙЛЫ (Files)**
- File upload input → `POST /api/files` (multipart) → saves file, parses it (CSV/JSON/HTML as already done in `handle_document` in `main.py`), stores entries in `bot_db.json`
- **Fix Cyrillic filename encoding bug**: when receiving the uploaded filename on the server, decode it explicitly as UTF-8. In the multipart handler, use `filename.encode('latin-1').decode('utf-8')` if the filename arrives garbled, OR set the response content-type header to include `charset=utf-8`. Also ensure the frontend sends the filename in the `Content-Disposition` header with proper UTF-8 encoding using `encodeURIComponent`.
- File list → `GET /api/files` → list keys from `bot_db.json` that start with `upload_`
- Delete file entry → `DELETE /api/files/:key`

### 4. CYRILLIC FILENAME ENCODING — fix the ĐĐ¾Đ¿Đ¾Đ²Đ° bug
This is a classic Latin-1 / UTF-8 mismatch. Fix it in TWO places:
- **Backend** (`main.py` `handle_document` or the API file upload handler): after getting `doc.file_name`, decode it properly:
  ```python
  filename = doc.file_name or ""
  try:
      filename = filename.encode('latin-1').decode('utf-8')
  except (UnicodeDecodeError, UnicodeEncodeError):
      pass  # already correct encoding
  ```
- **Frontend** (file upload fetch call): when constructing the FormData or fetch request, ensure the filename is sent as a UTF-8 string. Do NOT use `encodeURIComponent` on the filename in the `Content-Disposition` header — just pass it as-is from the File object's `.name` property, which browsers already provide as a proper Unicode string.

### 5. CAMPAIGNS — add DELETE functionality (both backend and frontend)
- **Backend**: add `DELETE /api/campaigns/:id` route. It calls `campaign_db.delete_campaign()` which already exists and blocks deletion if status is `running`. Return `{ ok: true }` on success or `{ error: "Cannot delete a running campaign" }` with 409.
- **Frontend**: add a 🗑 icon button to each campaign card in the РАССЫЛКИ list. On click → show a `confirm()` dialog ("Удалить рассылку «{name}»?"). On confirm → call the DELETE endpoint → remove the card from the list state.

### 6. REAL-TIME CAMPAIGN PROGRESS
- The РАССЫЛКИ page must poll `GET /api/campaigns/:id/status` every 5 seconds for campaigns with status `running` or `paused`, and update the progress bar and sent count live without full page reload.
- The progress bar fill % = `(sent_count / target_count) * 100`.

---

## IMPLEMENTATION APPROACH

### API Layer
Check the `lib/` directory for how API routes are currently defined (likely Express routes in a `server/` subfolder or similar). Follow the exact same pattern. All API endpoints must:
- Return JSON with `Content-Type: application/json; charset=utf-8`
- Use proper async/await
- Return appropriate HTTP status codes
- Call the Python backend via internal API call OR (if the TS server wraps the Python calls) use child_process or socket communication — follow whatever pattern already exists in the codebase

### DB Reset Script
Create `scripts/reset_db.py`:
```python
import sqlite3, json, os

conn = sqlite3.connect("campaigns.db")
conn.execute("DELETE FROM sends")
conn.execute("DELETE FROM campaigns")
conn.execute("DELETE FROM users")
conn.execute("DELETE FROM sender_accounts")
conn.commit()
conn.close()

with open("bot_db.json", "w", encoding="utf-8") as f:
    json.dump({}, f)

print("✅ DB cleared. Ready for real data.")
```
Run it once: `python scripts/reset_db.py`

---

## DO NOT BREAK
- The Telethon integration (`main.py` `get_telethon_client`, `_enrich_loop`, `_auto_enrich_upload`) — leave this logic intact
- The campaign sending engine (`campaign_sender.py`) — the send loop, pause/resume/cancel, and scheduler are correct, do not refactor them
- The password gate for the web UI — just fix the reload bug, keep the password check
- The Telegram bot commands (`/start`, `/broadcast`, `/campaigns`, etc.)
- The existing SQLite schema in `campaign_db.py` — do not change the schema, only add API routes on top of it

---

## TESTING CHECKLIST (verify each after implementing)
- [ ] Dashboard loads with all zeros (no fake data)
- [ ] Password entry works without page reload
- [ ] РАССЫЛКИ list is empty on fresh start; "Создать кампанию" opens a working form
- [ ] Created campaign appears in the list with correct status
- [ ] Play/Pause buttons on campaigns actually start/stop the send loop
- [ ] Delete button removes a campaign (with confirmation)
- [ ] АУДИТОРИЯ shows 0 users initially; users appear after interacting with the Telegram bot
- [ ] File upload with Cyrillic filename (e.g. "Попова_список.csv") shows the correct filename, not garbled text
- [ ] АККАУНТЫ tab shows empty list; adding an account initiates the Telethon phone auth
- [ ] All tab navigation buttons work (no dead clicks)
