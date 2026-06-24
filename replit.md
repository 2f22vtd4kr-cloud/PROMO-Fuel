# PROMO-Fuel

A Telegram Mini App for fuel station owners to run targeted promo campaigns, manage sender accounts, and track audience analytics — with an Apple Liquid Glass dark UI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/telegram-miniapp run dev` — run the Mini App dev server (port 3000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `scripts/post-merge.sh` — run after any dependency change to rebuild better-sqlite3

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Mini App: React 19 + Vite 7, Liquid Glass CSS system
- API: Express 5, better-sqlite3 (SQLite), Drizzle ORM
- Telegram: python-telegram-bot (main bot), window.Telegram.WebApp (Mini App)
- Build: esbuild (API), Vite (Mini App)

## Where things live

- `artifacts/telegram-miniapp/src/` — Mini App React source
  - `pages/` — Home, Campaigns, Analytics, Audience, Accounts, Editor
  - `components/GlassCard.tsx` — shared glass material component
  - `lib/twa.ts` — typed Telegram WebApp wrapper (window.Telegram global)
  - `lib/theme.ts` — TG color tokens
- `artifacts/api-server/src/` — Express API
  - `routes/` — campaigns, accounts, analytics, users, events (SSE)
  - `app.ts` — serves telegram-miniapp/dist as static SPA in production
- `main.py` / `bot/` — Python Telegram bot
- `campaigns.db` — SQLite database (campaigns, users, sends)

## Architecture decisions

- **better-sqlite3** must be rebuilt from source on every cold start (see `scripts/post-merge.sh`). The `.node` binary is not committed.
- **No @twa-dev/sdk package** — uses `window.Telegram.WebApp` global loaded from `https://telegram.org/js/telegram-web-app.js` in index.html. Avoids version mismatch issues.
- **Role detection** via `VITE_OWNER_IDS` env var (comma-separated Telegram user IDs). If unset → defaults to owner view for development.
- **API server** runs on port 8080 in dev, `PORT` env var in production (Replit autoscale sets this automatically).
- **SVG charts** instead of recharts — keeps the telegram-miniapp bundle lean with no extra dependencies.

## Product

PROMO-Fuel lets gas station operators send targeted discount promos to their Telegram audience via a Mini App. Owners manage campaigns, sender accounts, and audience segments. Consumers see available promos, a map, and their reward balance.

## User preferences

- Apple Liquid Glass dark design system throughout
- Russian language UI
- Real data from SQLite via Express API — no mocked data
- **Session handoff:** agent MUST read `HANDOFF.md` at the start of every session and rewrite it at the end, rolling all prior session context into one document (session span = 1 — rewrite, not append)

## Gotchas

- **better-sqlite3** needs `scripts/post-merge.sh` to run after merges or cold starts. Deployment build runs `scripts/deploy-build.sh` which handles this automatically.
- API server PORT: requires `PORT` env var (or defaults to 8080). Replit autoscale sets this.
- `pnpm.onlyBuiltDependencies` in root `package.json` must include `better-sqlite3` — otherwise pnpm skips the native build.
