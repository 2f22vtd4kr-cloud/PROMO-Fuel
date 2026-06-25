#!/bin/bash
# Runs before vite on every cold start.
#
# Fast path A — sentinel: post-merge.sh completed and vite exists → instant exit.
# Fast path B — vite already linked (repeated restart) → instant exit.
# Slow path   — pnpm install, then re-verify.

WORKSPACE="$(cd "$(dirname "$0")/.." && pwd)"
SENTINEL="$WORKSPACE/.deps-ready"
VITE_JS="$WORKSPACE/artifacts/telegram-miniapp/node_modules/vite/bin/vite.js"

# ── Fast path A: sentinel + vite already present → skip install ─────────────
# NOTE: We check BOTH sentinel AND vite.js existence.
# The sentinel can be stale (committed to git, fresh import, empty node_modules)
# so trusting it blindly would skip install and let vite fail to start.
if [ -f "$SENTINEL" ] && [ -f "$VITE_JS" ]; then
  echo "[ensure-node-deps] ✓ .deps-ready sentinel + vite found — skipping install"
  exit 0
fi

# ── Fast path B: vite already present (no sentinel needed) ───
if [ -f "$VITE_JS" ]; then
  echo "[ensure-node-deps] ✓ node_modules OK — skipping install"
  exit 0
fi

# ── Slow path: install ───────────────────────────────────────
echo "[ensure-node-deps] vite not found — running pnpm install..."
# --ignore-scripts prevents node-gyp from running for better-sqlite3.
# Node-gyp picks up pnpm's bundled Node 24 headers but the runtime is Node 20,
# causing a fatal version mismatch. ensure-sqlite3.sh handles the native build.
pnpm install --frozen-lockfile --ignore-scripts --silent 2>&1 | tail -5 || \
  pnpm install --no-frozen-lockfile --ignore-scripts --silent 2>&1 | tail -5 || true

if [ ! -f "$VITE_JS" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ⛔  CRITICAL: vite not found after pnpm install             ║"
  echo "║                                                              ║"
  echo "║  Mini App cannot start. Run manually:                        ║"
  echo "║    pnpm install --no-frozen-lockfile                         ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  exit 1
fi

echo "[ensure-node-deps] ✓ Done — vite ready."
