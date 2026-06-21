#!/bin/bash
set -e

# Install Python dependencies
pip install -r requirements.txt --quiet 2>&1 || true

# Install Node.js dependencies
# Note: preinstall hook in package.json creates .venv for Python
pnpm install --frozen-lockfile

# Fix missing .bin symlinks for vite in workspace packages
VITE_BIN="$(pwd)/node_modules/.pnpm/node_modules/.bin/vite"
if [ -f "$VITE_BIN" ]; then
  for pkg in artifacts/crm-platform artifacts/telegram-miniapp artifacts/mockup-sandbox; do
    if [ -d "$(pwd)/$pkg" ]; then
      mkdir -p "$(pwd)/$pkg/node_modules/.bin"
      if [ ! -f "$(pwd)/$pkg/node_modules/.bin/vite" ]; then
        ln -sf "$VITE_BIN" "$(pwd)/$pkg/node_modules/.bin/vite"
        chmod +x "$(pwd)/$pkg/node_modules/.bin/vite"
        echo "Linked vite for $pkg"
      fi
    fi
  done
fi

# NOTE: better-sqlite3 native rebuild is intentionally NOT done here —
# it takes ~30s which exceeds the 20s post-merge timeout.
# The API Server workflow (scripts/start-api.sh) rebuilds it at startup
# if the .node file is missing.
echo "Post-merge setup complete. better-sqlite3 will be rebuilt on next API Server start."
