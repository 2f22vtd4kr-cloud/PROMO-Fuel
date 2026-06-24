#!/bin/bash
# Runs before vite on every cold start.
#
# Fast path A — sentinel: post-merge.sh completed and vite exists → instant exit.
# Fast path B — vite already linked (repeated restart) → instant exit.
# Slow path   — pnpm install, then re-verify.

WORKSPACE="$(cd "$(dirname "$0")/.." && pwd)"
SENTINEL="$WORKSPACE/.deps-ready"
VITE_JS="$WORKSPACE/artifacts/telegram-miniapp/node_modules/vite/bin/vite.js"

# ── Fast path A: sentinel written by post-merge → trust it, skip everything ──
if [ -f "$SENTINEL" ]; then
  echo "[ensure-node-deps] ✓ .deps-ready sentinel found — skipping install"
  exit 0
fi

# ── Fast path B: vite already present (no sentinel needed) ───
if [ -f "$VITE_JS" ]; then
  echo "[ensure-node-deps] ✓ node_modules OK — skipping install"
  exit 0
fi

# ── Slow path: install ───────────────────────────────────────
echo "[ensure-node-deps] vite not found — running pnpm install..."
pnpm install --frozen-lockfile --silent 2>&1 | tail -5 || \
  pnpm install --no-frozen-lockfile --silent 2>&1 | tail -5 || true

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
