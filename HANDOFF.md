# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Avatar Pool Upload — Root cause fixed (counter stays at 0)

**Root cause:** `python-multipart` package was never installed in the Nix-managed `.pythonlibs` environment. FastAPI silently returns 500 for any `request.form()` call without it, so every avatar upload failed and the counter stayed at 0.

**Fix:** Replaced multipart form upload with JSON+base64 throughout the whole chain:

- **Python `account_factory.py`** (`/upload-avatars` endpoint): now reads `await request.json()` — a dict with `{gender, files: [{name, data}]}` where `data` is raw base64. Decodes and writes each file. Returns `{saved, gender, counts}`.
- **Node.js `factory.ts`** (`POST /upload-avatars` proxy): reads pre-parsed `req.body` (Express already parsed JSON) and forwards it as `application/json` to Python. No more raw-stream chunking.
- **Frontend `AccountFactory.tsx`** (`uploadAvatarsToGender`): reads each File with `FileReader.readAsDataURL`, strips the data-URL prefix, and POSTs `{gender, files: [{name, data}]}` as JSON. Counter updates from `data.counts` in response.
- **`artifacts/api-server/src/app.ts`**: increased `express.json` limit `10mb → 50mb` to handle batch photo uploads.
- **`requirements.txt`**: deduplicated (was 4× repeated) and added `python-multipart>=0.0.9` for documentation (it's not installed yet but avoids confusion for next fresh install).

**End-to-end tested:** POST to port 8083 (Python direct) → 200 `{saved:1, counts:{male:1, female:0}}`. POST via port 8080 (Node proxy) → 200 `{saved:1, counts:{male:1, female:1}}`. Files land in `assets/pending_avatars/<gender>/`.

### Previous session work (still in place)

- Gender symbol alignment: ♂/♀ rendered inline in label strings with `textAlign:center` on button
- Avatar folder management: 📂 browser, thumbnail grid, ✕ delete per photo (all endpoints live)
- New Python endpoints: `GET /avatar-list`, `DELETE /avatar/{gender}/{filename}`, `GET /avatar-image/{gender}/{filename}`

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080)
- **Telegram Mini App**: RUNNING on port 5000 (Vite)
- **DB**: campaigns.db current

---

## Key file locations

- `account_factory.py` — upload endpoint ~line 2585; avatar-list/delete/image ~line 2632+
- `artifacts/api-server/src/routes/factory.ts` — upload proxy ~line 961; avatar proxies ~line 982+
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx`
  - `uploadAvatarsToGender` (base64 JSON upload) — ~line 831
  - `fetchAvatarList` / `handleDeleteAvatar` — ~line 868
  - Avatar pool UI with 📂 browser + thumbnail grid — ~line 3562

---

## Pending / watch items

- `python-multipart` still not actually installed in `.pythonlibs` (Nix blocks pip). Upload now works without it via JSON+base64. If ever needed for other endpoints, use `pip install --target .pythonlibs/lib/python3.12/site-packages python-multipart`.
- `DEVICE_PROFILES` Android pool still unused in registration — needs official Android api_id.
- `[pg-guard] FAILED to create saved_proxies — duplicate key` in API Server logs is harmless.
- `assets/pending_avatars/` folders are empty on fresh import — user must upload photos before factory AI mode can assign avatars.
