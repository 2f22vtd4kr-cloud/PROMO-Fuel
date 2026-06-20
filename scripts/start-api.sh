#!/bin/bash
set -e

echo "=== API Server startup ==="

# Ensure node_modules are installed (fast if already done)
echo "Checking dependencies..."
pnpm install --frozen-lockfile --ignore-scripts 2>&1 | tail -3

# Build better-sqlite3 native addon if missing
BSQ="$(pwd)/node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3"
OUT="$BSQ/build/Release"
if [ ! -f "$OUT/better_sqlite3.node" ]; then
  echo "Building better-sqlite3 native addon..."
  mkdir -p "$OUT"
  NODE_EXEC=$(node -e "console.log(process.execPath)")
  NODE_NIX_DIR=$(dirname $(dirname "$NODE_EXEC"))
  NODE_INC="$NODE_NIX_DIR/include/node"

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
  echo "better-sqlite3 built OK"
else
  echo "better-sqlite3 already built, skipping"
fi

# Start the API server
echo "Starting API server..."
exec pnpm --filter @workspace/api-server run dev
