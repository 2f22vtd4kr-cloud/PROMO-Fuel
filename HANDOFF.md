# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. Account Factory — Step 3 SMS flow fixes (3 fixes)

**Fix A — `PhoneNumberInvalidError` killed the whole factory**
Imported `PhoneNumberInvalidError` from `telethon.errors`. Now caught explicitly
in both the raw-request and fallback `send_code_request` paths. Cancels the
SMSPool order and `continue`s to the next number instead of `return` (abort).

**Fix B — "definitive recycled" false positive on dev api_id**
The triple `SentCodeTypeApp + next_type=None + ResendCode→SendCodeUnavailable`
now only sets `_definitive_recycled = True` (skipping L2) when `_actual_api_id`
is an official Telegram api_id (2040/2496/6). Dev api_ids fall through to L2.

**Fix C — Dev api_id moved to END of `_reg_pool`; ResendCode skipped for dev**
Dev api_id (30533575) ALWAYS produces `SentCodeTypeApp` — Telegram routes
codes to the developer's own installed app regardless of target number. This
added ~10-15s overhead per attempt with no benefit. Fix: `_reg_pool.append()`
instead of `.insert(0, ...)`. ResendCode also skipped for non-official api_ids
(`_is_official_primary` guard) — ResendCode on dev api_id always fails.

### 2. Avatar pool — broken images, duplication, gender toggle

**Root cause of broken images:**
`API_SECRET` IS set in production. `<img src="/api/factory/avatar-image/...">` 
cannot send Bearer headers → 401 silently → broken `?` icon. Fix: added
`p.includes("/avatar-image/")` to the auth-skip list in `artifacts/api-server/src/app.ts`
(same pattern as `/twa`, `/health`, `/proxy-store`).

**Root cause of apparent duplication:**
Upload was hardcoded to `gender: "male"` — so ALL photos landed in the male
pool, while old female photos already existed. The count showed male + female
combined, making it look like duplicates. Fix: `uploadAvatars` now takes a
`gender` param; the UI has a gender toggle.

**Gender toggle added to AI mode avatar upload:**
- ♂ Чоловічі / ♀ Жіночі toggle chips appear in the upload panel (blue/pink)
- File picker label and dashed border change colour per selection
- Staging commit button passes the selected gender to `uploadAvatars`

**Browser now shows gendered sections:**
The avatar pool browser splits into ♂ and ♀ sections with per-section count
badges and colour-coded borders (blue for male, pink for female).

**Pre-existing TypeScript errors fixed:**
- `ManualFactory.tsx:413` — `L("att.","спроб")` was missing the `lang` arg; fixed to `L(lang, ...)`
- `AccountFactory.tsx:4809` — `runState !== "idle"` replaced with explicit union for TypeScript narrowing

---

## Workflow status
- **Telegram Bot**: RUNNING — supervisor up, FastAPI 8083, PTB polling, all 12 migrations OK
- **Telegram Mini App** (port 5000): RUNNING — Vite HMR
- **API Server** (port 8080): RUNNING

## Architecture reminders (carry-forward)
- `_reg_pool` order: official creds shuffled (2040/2496/6) + dev api_id appended last
- `_OFFICIAL_CLIENT_CREDS` api_ids: 2040 (Desktop), 2496 (iOS), 6 (Android)
- `_is_official_primary` = `_actual_api_id in {c[0] for c in _OFFICIAL_CLIENT_CREDS}`
- ResendCode only runs for official primary api_ids; dev api_ids skip straight to L2
- `_definitive_recycled = True` → L2 skipped. Only trustworthy from official api_ids.
- `avatar_pool` table: `filename TEXT UNIQUE` (globally, not per gender). Content-hash filenames avoid collisions in practice.
- `avatar-image` Express route is whitelisted from Bearer auth (`app.ts` skip list) — `<img>` tags can't send auth headers.
- Vite proxy: `/api/*` → Node.js 8080 → Python FastAPI 8083
- `pnpm install` must always use `--ignore-scripts`

## Known non-issues
- mockup-sandbox: PolishComplete/RefinedDepth/GroupsV2/WorkersV3/VideoTemplate.tsx — corrupted JSX, pre-existing, don't fix.
- Telegram Bot 409 conflicts on startup: normal for multi-instance starts, self-resolves ~15s.
- `MINIAPP_URL` / `VITE_OWNER_IDS` / `TELETHON_PHONE` supervisor warnings: expected in dev.
