#!/bin/bash
# Runs before vite on every cold start.
# Fast path: if vite is already linked, skip pnpm install.
# Slow path: runs pnpm install, then re-verifies — screams if vite still missing.

VITE_JS="$(pwd)/artifacts/telegram-miniapp/node_modules/vite/bin/vite.js"

if [ -f "$VITE_JS" ]; then
  echo "[ensure-node-deps] ✓ node_modules OK — skipping install"
  exit 0
fi

echo "[ensure-node-deps] vite not found — running pnpm install..."
pnpm install --no-frozen-lockfile --silent 2>&1 | tail -5 || true

if [ ! -f "$VITE_JS" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ⛔  CRITICAL: vite not found after pnpm install             ║"
  echo "║                                                              ║"
  echo "║  Mini App cannot start. Run manually:                        ║"
  echo "║    pnpm install --no-frozen-lockfile                         ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  exit 1
fi

echo "[ensure-node-deps] ✓ Done — vite ready."
