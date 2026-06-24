# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Migration to Replit environment + Avatar Pool UX fixes

**Migration:**
- Fixed workflow commands to use absolute paths (`/home/runner/workspace/scripts/...`) — previously failed with "No such file or directory" because Replit shell runs from an unset cwd
- Installed Python deps via `ensure-python-deps.sh` and Node deps via `pnpm install`
- Started all three workflows: Telegram Bot, Telegram Mini App, API Server

**Avatar pool counter fix (AccountFactory.tsx + account_factory.py):**
- Root cause: API Server (Node.js, port 8080) was not started — Vite proxy couldn't forward `/api/*` calls
- Additional fix: `upload-avatars` Python endpoint now returns `counts` (male/female) in its response body, so the frontend updates the counter instantly from the upload response without a separate `/avatar-counts` round-trip

**Gender symbol alignment fix (AccountFactory.tsx):**
- ♂/♀ Unicode glyphs were rendered inline in label strings → caused baseline misalignment on mobile
- Now rendered in a separate `<span>` with explicit `fontSize: 13, lineHeight: 1` alongside the label text
- Changed `⚄` (die face) for Random to `🔀` emoji — renders consistently across platforms

**Avatar folder management (new feature):**
- Python `account_factory.py`: added 3 new endpoints on `factory_router`:
  - `GET /avatar-list?gender=male|female` — lists filenames in `assets/pending_avatars/<gender>/`
  - `DELETE /avatar/{gender}/{filename}` — deletes a specific file (path-traversal sanitised)
  - `GET /avatar-image/{gender}/{filename}` — serves the image via `FileResponse`
- Node.js `factory.ts`: added proxy routes for all three new endpoints
- UI: added 📂 button (only visible when count > 0) that toggles an inline thumbnail grid; each thumbnail has a ✕ delete button; counter decrements instantly on delete

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + 2 workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080, rebuilt from source this session)
- **Telegram Mini App**: RUNNING on port 5000 (Vite HMR confirmed all edits live)
- **DB**: campaigns.db current, PG snapshot in sync

---

## Key file locations

- `account_factory.py` — new avatar endpoints at bottom of file (~line 2625+)
- `artifacts/api-server/src/routes/factory.ts` — new proxy routes at bottom (~line 989+)
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`
  - `avatarFiles` / `showAvatarBrowser` / `deletingAvatar` state — ~line 732
  - `uploadAvatarsToGender` (uses `counts` from response) — ~line 831
  - `fetchAvatarList` / `handleDeleteAvatar` — ~line 859
  - Gender selector buttons (icon + label split) — ~line 3526
  - Avatar pool UI with 📂 browser + thumbnail grid — ~line 3562

---

## Pending / watch items

- `DEVICE_PROFILES` Android pool still unused in registration — needs official Android api_id.
- `[pg-guard] FAILED to create saved_proxies — duplicate key` in API Server logs is harmless.
- 409 Conflict in bot logs is normal — clears after ~35s.
- `assets/pending_avatars/` folders are empty on fresh import — user must upload photos before factory AI mode can assign avatars.
