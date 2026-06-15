#!/bin/bash
set -e

echo "=== PROMO-Fuel deployment build ==="

# Step 1: Install all workspace dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# Fix missing .bin symlinks for vite in workspace packages
VITE_BIN=$(find "$(pwd)/node_modules/.pnpm" -maxdepth 3 -name "vite.js" -path "*/vite/bin/vite.js" 2>/dev/null | head -1)
if [ -n "$VITE_BIN" ]; then
  for pkg in artifacts/crm-platform artifacts/telegram-miniapp artifacts/mockup-sandbox; do
    if [ -d "$pkg/node_modules" ]; then
      mkdir -p "$pkg/node_modules/.bin"
      if [ ! -f "$pkg/node_modules/.bin/vite" ]; then
        ln -sf "$VITE_BIN" "$pkg/node_modules/.bin/vite"
        chmod +x "$pkg/node_modules/.bin/vite"
        echo "Linked vite for $pkg"
      fi
    fi
  done
fi

# Step 2: Rebuild better-sqlite3 native addon
BSQ="$(pwd)/node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3"
if [ -d "$BSQ" ]; then
  echo "Rebuilding better-sqlite3..."
  OUT="$BSQ/build/Release"
  mkdir -p "$OUT"

  NODE_EXEC=$(node -e "console.log(process.execPath)")
  NODE_NIX_DIR=$(dirname $(dirname "$NODE_EXEC"))
  NODE_INC="$NODE_NIX_DIR/include/node"

  if [ -d "$NODE_INC" ]; then
    gcc -O1 -fPIC -pthread -std=c99 -w \
      -c "$BSQ/deps/sqlite3/sqlite3.c" -o "$OUT/sqlite3.o" \
      -DSQLITE_THREADSAFE=2 -DSQLITE_OMIT_SHARED_CACHE -DSQLITE_DEFAULT_MEMSTATUS=0 \
      -DSQLITE_OMIT_DEPRECATED -DSQLITE_ENABLE_FTS5 -DSQLITE_ENABLE_FTS4 \
      -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_FTS3_PARENTHESIS \
      -DSQLITE_ENABLE_JSON1 -DSQLITE_ENABLE_RTREE -DSQLITE_ENABLE_COLUMN_METADATA \
      -DSQLITE_ENABLE_DBSTAT_VTAB -DSQLITE_ENABLE_DESERIALIZE \
      -DSQLITE_DQS=0 -DSQLITE_DEFAULT_FOREIGN_KEYS=1 -DNDEBUG

    g++ -O2 -fPIC -pthread -fno-rtti -fno-exceptions -std=gnu++20 -shared \
      -I"$NODE_INC" \
      -I"$BSQ/deps/sqlite3" \
      -I"$BSQ/src" \
      "$BSQ/src/better_sqlite3.cpp" \
      "$OUT/sqlite3.o" \
      -o "$OUT/better_sqlite3.node"
    echo "better-sqlite3 rebuilt OK"
  else
    echo "WARNING: Node headers not found at $NODE_INC"
  fi
else
  echo "WARNING: better-sqlite3 not found at $BSQ"
fi

# Step 2: Build the API server
echo "Building API server..."
pnpm --filter @workspace/api-server run build

# Step 3: Build the Telegram Mini App
echo "Building Telegram Mini App..."
pnpm --filter @workspace/telegram-miniapp run build

echo "=== Build complete ==="
