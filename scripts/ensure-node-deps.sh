#!/bin/bash
# Fast Node dependency check — run before vite on every cold start.
# Only runs pnpm install if vite is missing from the miniapp's node_modules.
VITE_JS="$(pwd)/artifacts/telegram-miniapp/node_modules/vite/bin/vite.js"

if [ -f "$VITE_JS" ]; then
  echo "[ensure-node-deps] node_modules OK — skipping install"
  exit 0
fi

echo "[ensure-node-deps] Installing Node packages (pnpm install)..."
pnpm install --no-frozen-lockfile --silent 2>&1 | tail -3 || true
echo "[ensure-node-deps] Done."
