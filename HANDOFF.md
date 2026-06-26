# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Data persistence — DB moved to `data/campaigns.db`

**Goal**: Move SQLite DB to a persistent `data/` directory, add startup backups, a download endpoint, and a Step 13 migration.

**Changes made:**

1. **`data/` directory created** (`data/campaigns.db` + `data/backups/`). Existing `campaigns.db` copied to `data/campaigns.db`. `.gitkeep` added.

2. **`DB_PATH` env var set** to `./data/campaigns.db` (shared environment via Replit secrets system).

3. **`campaign_db.py`**: Added `import os`; updated default to `os.getenv("DB_PATH", "./data/campaigns.db")`.

4. **`dbmigrations.py`**: Updated default to `os.getenv("DB_PATH", "./data/campaigns.db")`.

5. **`db_sync.py`**: Both `save_snapshot()` and `restore_if_fresh()` now default to `""` (resolved from env at runtime). `restore_if_fresh` also calls `os.makedirs(data_dir, exist_ok=True)` before writing.

6. **`supervisor.py`**: Added `_ensure_persistent_db(db_path)` function (called before `restore_if_fresh` in phase 0):
   - Creates `data/` + `data/backups/` dirs
   - One-time root→data migration if `data/campaigns.db` missing and `campaigns.db` exists
   - Startup backup (`data/backups/campaigns_YYYYMMDD_HHMMSS.db`), prunes to 10 most recent

7. **`dbmigrations.py` — Step 13**: Added after Step 12:
   - `ALTER TABLE sender_accounts ADD COLUMN health_score REAL NOT NULL DEFAULT 1.0`
   - `ALTER TABLE sender_accounts ADD COLUMN fingerprint_data TEXT NOT NULL DEFAULT '{}'`
   - `ALTER TABLE sender_accounts ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`
   - `CREATE TABLE IF NOT EXISTS settings (key TEXT PK, value TEXT, updated_at TEXT)`

8. **`apiserver.py`** (Python FastAPI, port 8083): Added `GET /internal/db-backup` endpoint (FileResponse, no auth, dev/internal only). Fixed `internal_sync` default path.

9. **`artifacts/api-server/src/routes/sync.ts`** (Node.js, port 8080): Added `GET /sync/download-db` endpoint (streams `data/campaigns.db` as download). Added `import fs, path`.

10. **`artifacts/api-server/src/routes/index.ts`**: Added `import syncRouter from "./sync"` and `router.use(syncRouter)`.

11. **`artifacts/api-server/src/lib/db-path.ts`**: Updated fallback to check `data/campaigns.db` first. Fixed env var handling — if `DB_PATH` is relative and doesn't exist locally, tries `../../<DB_PATH>` (workspace root resolution for monorepo).

12. **`artifacts/telegram-miniapp/src/pages/Dashboard.tsx`**: Added `DbBackupCard` sub-component (sync + download button) inserted before `<AdminActions>`. Button calls `POST /api/sync/now` then triggers download via `GET /api/sync/download-db`.

---

## Current system state

- **Telegram Bot**: Running, `DB_PATH = ./data/campaigns.db` ✓, Step 13 migration applied ✓, vacuum running on `./data/campaigns.db` ✓.
- **Node.js API Server** (port 8080): Running, resolved `DB_PATH` correctly via workspace-root fallback ✓.
- **Mini App** (Vite, port 5000): Running, HMR applied Dashboard.tsx changes ✓.
- **Python FastAPI** (port 8083): Running, `/internal/db-backup` endpoint live ✓.

## Known issues / next steps

- `persistentDirs` not added to `.replit` (blocked by tool restriction). Real persistence handled by `db_sync.py` → PostgreSQL, which is the correct layer for autoscale.
- mockup-sandbox canvas artifacts (PolishComplete.tsx, RefinedDepth.tsx, GroupsV2.tsx, WorkersV3.tsx, VideoTemplate.tsx) have known corrupted JSX — typecheck errors exist but do NOT affect the live app.
- `DB_PATH` is `./data/campaigns.db` (relative, workspace-root-relative). Node.js API server resolves it via the `../../` fallback in `db-path.ts`. If process CWD changes, check `db-path.ts`.

## Slide counts (unchanged)

| Manual | Slides |
|---|---|
| Manual.tsx (Main guide) | 34 |
| ManualFactory.tsx | 18 |
| ManualAccounts.tsx | 12 |
| ManualVerification.tsx | 15 |
