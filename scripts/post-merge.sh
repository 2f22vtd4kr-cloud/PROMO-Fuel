#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Rebuild better-sqlite3 native module for the current Node.js version
NODEGYP=$(find /nix/store -name "node-gyp.js" -path "*/node-gyp/bin/*" 2>/dev/null | head -1)
BSQ="$(pwd)/node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3"
if [ -n "$NODEGYP" ] && [ -d "$BSQ" ]; then
  echo "Rebuilding better-sqlite3 native module..."
  (cd "$BSQ" && node "$NODEGYP" rebuild --release 2>&1 | tail -5) || true
fi

pnpm --filter db push
