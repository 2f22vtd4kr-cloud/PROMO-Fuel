# PROMO-Fuel — Handoff

**Last updated:** 2026-06-24

---

> **AGENT PROTOCOL — read this first, every session**
> 1. Read this file completely before touching code.
> 2. Rewrite this file after EVERY response turn that does real work.
> 3. Replace "This session" entirely — do NOT accumulate past sessions here.
> 4. Check secrets on fresh import (see section below) before doing anything else.
> HANDOFF.md must stay under ~150 lines. Previous session details live in git history.

---

## This session

**What was worked on:**

**Turn 1 — Project imported to Replit environment**
Both workflows running: Telegram Bot (supervisor + 2 workers + FastAPI 8083) and Telegram Mini App (Vite port 5000). Python deps installed via installLanguagePackages. Node deps via pnpm install. `.deps-ready` sentinel written. Import marked complete.

**Turn 2 — Account Factory: gendered AI personality + avatar pool UI**
Full gender separation for AI account creation:

- **`account_factory.py`**:
  - `_generate_ai_profile()` call now passes `gender=gender` so female/male names and bio themes are applied correctly.
  - `_pick_pending_avatar()` call now passes `gender=gender` so photos come from the correct subfolder (`pending_avatars/male/` or `pending_avatars/female/`).
  - New `gender` field extracted from `/register` request body (valid: `"male"`, `"female"`, `"random"`); passed through to `_registration_stream()`.
  - New `GET /api/factory/avatar-counts` endpoint — returns `{male: N, female: N}` photo counts from pending folders.
  - New `POST /api/factory/upload-avatars` endpoint — accepts multipart `{gender, file_0, file_1, …}`, saves to `assets/pending_avatars/{gender}/`.

- **`artifacts/api-server/src/routes/factory.ts`**:
  - Added proxy for `GET /api/factory/avatar-counts` → Python 8083.
  - Added streaming proxy for `POST /api/factory/upload-avatars` → Python 8083 (raw body passthrough for multipart).

- **`artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`**:
  - New state: `aiGender` ("male"/"female"/"random"), `avatarCounts`, `showMaleUpload`, `showFemaleUpload`, `uploadingGender`.
  - `fetchAvatarCounts()` callback + useEffect on mount; called again after each upload.
  - `uploadAvatarsToGender(files, gender)` helper — posts FormData to `/api/factory/upload-avatars`, refreshes counts.
  - Gender selector (♂ Man / ♀ Woman / ⚄ Random) with blue/pink/purple pill buttons; shows bio-theme hint for non-random.
  - Avatar pool section: per-gender indicator bar (green ≥15 / yellow 5–14 / red 1–4 / black 0) with count badge + `+ Add` toggle button; upload panel expands inline on toggle (collapses after upload), no permanent drop zone visible.
  - `gender: aiGender` now included in the `/api/factory/register` POST body when `profileMode === "ai"`.

**What to do next session:** User requested historical `factory_country_stats` data alongside SMSPool success rate in country rankings (own attempts/successes/recycled per country side-by-side).

---

## Current state

- ✅ Telegram Bot workflow running (supervisor + 2 workers + FastAPI port 8083)
- ✅ Telegram Mini App workflow running (Vite dev port 5000)
- ✅ All 8 secrets set in this Replit project
- ✅ Account Factory: full gender separation (names, bio, avatars, photos folder)
- ✅ `assets/pending_avatars/male/` and `assets/pending_avatars/female/` used automatically

---

## Required secrets (check on fresh import)

On fresh GitHub import: run `viewEnvVars()` in code_execution, then `requestEnvVar()` for any missing:

| Secret | Where to get it |
|---|---|
| `TELEGRAM_TOKEN` | @BotFather on Telegram |
| `TELETHON_API_ID` | https://my.telegram.org/apps (integer) |
| `TELETHON_API_HASH` | https://my.telegram.org/apps |
| `ADMIN_TELEGRAM_ID` | @userinfobot on Telegram |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GROQ_API_KEY` | https://console.groq.com/keys |
| `SMSPOOL_API_KEY` | https://smspool.net/profile |
| `API_SECRET` | Any strong random string (`openssl rand -hex 32`) |

Non-sensitive env var already set as shared: `PORT=8080`.

---

## Standing architecture facts

### Ports
| Service | Port |
|---|---|
| Vite Mini App dev | 5000 (exposed as 80) |
| Python FastAPI | 8083 |
| Node.js Express API | 8080 |

### Account Factory
- Python: `account_factory.py` → `_registration_stream()` generator
- Node API: `artifacts/api-server/src/routes/factory.ts`
- UI: `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`
- Avatar folders: `assets/pending_avatars/male/`, `assets/pending_avatars/female/`, `assets/used_avatars/male/`, `assets/used_avatars/female/`
- Gender param flows: UI → POST body `gender` → Python `/register` → `_registration_stream(gender=)` → `_generate_ai_profile(gender=)` + `_pick_pending_avatar(gender=)`
- Best countries June 2026: KH > LA > MM > KZ > NP > UZ. VN = 100% recycled.

### Startup
1. `post-merge.sh` → checks missing secrets → pip+pnpm parallel → sqlite3 compile → writes `.deps-ready`
2. All restarts after: `ensure-*.sh` sees sentinel → exits in <100ms

### Key files
| File | Purpose |
|---|---|
| `account_factory.py` | All Telegram registration logic + avatar endpoints |
| `supervisor.py` | Process manager |
| `scripts/post-merge.sh` | Parallel dep install + sentinel + secrets warning |
| `campaigns.db` | SQLite — all tables |
| `sessions/` | Telethon .session files |
| `assets/pending_avatars/` | Unused avatar photos (male/ female/ subfolders) |
| `assets/used_avatars/` | Already-assigned avatars (male/ female/ subfolders) |
| `HANDOFF.md` | This file |
