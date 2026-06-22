#!/bin/bash
set -e

# Install Python dependencies
pip install -r requirements.txt --quiet 2>&1 || true

# Install Node.js dependencies
pnpm install --frozen-lockfile

# Fix missing .bin symlinks for vite in workspace packages
# vite lives in the pnpm store, not inside the miniapp's own node_modules
PNPM_VITE="$(find "$(pwd)/node_modules/.pnpm" -name "vite.js" -path "*/vite/bin/vite.js" 2>/dev/null | head -1)"
if [ -n "$PNPM_VITE" ]; then
  mkdir -p "$(pwd)/artifacts/telegram-miniapp/node_modules/.bin"
  ln -sf "$PNPM_VITE" "$(pwd)/artifacts/telegram-miniapp/node_modules/.bin/vite"
  chmod +x "$PNPM_VITE"
  echo "Linked vite for telegram-miniapp: $PNPM_VITE"
else
  echo "WARNING: vite not found in pnpm store — run pnpm install first"
fi

# Rebuild better-sqlite3 native module if needed
BSQ="$(pwd)/node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3"
NODE_FILE="$BSQ/build/Release/better_sqlite3.node"
if [ ! -f "$NODE_FILE" ] && [ -d "$BSQ" ]; then
  echo "Rebuilding better-sqlite3 native module..."
  OUT="$BSQ/build/Release"
  mkdir -p "$OUT"
  NODE_EXEC=$(node -e "console.log(process.execPath)")
  NODE_DIR="$(dirname $(dirname $NODE_EXEC))"
  NODE_INC="$NODE_DIR/include/node"
  if [ -d "$NODE_INC" ]; then
    gcc -O1 -fPIC -pthread -std=c99 -w \
      -c "$BSQ/deps/sqlite3/sqlite3.c" -o "$OUT/sqlite3.o" \
      -DSQLITE_THREADSAFE=2 -DSQLITE_OMIT_SHARED_CACHE -DSQLITE_DEFAULT_MEMSTATUS=0 \
      -DSQLITE_OMIT_DEPRECATED -DSQLITE_ENABLE_FTS5 -DSQLITE_ENABLE_FTS4 \
      -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_FTS3_PARENTHESIS \
      -DSQLITE_ENABLE_JSON1 -DSQLITE_ENABLE_RTREE -DSQLITE_ENABLE_COLUMN_METADATA \
      -DSQLITE_ENABLE_DBSTAT_VTAB -DSQLITE_ENABLE_DESERIALIZE \
      -DSQLITE_DQS=0 -DSQLITE_DEFAULT_FOREIGN_KEYS=1 -DNDEBUG && \
    g++ -O2 -fPIC -pthread -fno-rtti -fno-exceptions -std=gnu++20 -shared \
      -I"$NODE_INC" \
      -I"$BSQ/deps/sqlite3" \
      -I"$BSQ/src" \
      "$BSQ/src/better_sqlite3.cpp" \
      "$OUT/sqlite3.o" \
      -o "$OUT/better_sqlite3.node" && echo "better-sqlite3 rebuilt OK" || echo "better-sqlite3 build FAILED (non-fatal)"
  else
    echo "Node headers not found at $NODE_INC, skipping rebuild"
  fi
fi

echo "Post-merge setup complete."
