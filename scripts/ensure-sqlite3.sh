#!/bin/bash
# Find workspace root (two levels up from this script, or use WORKSPACE_ROOT if set)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BSQ="$WORKSPACE_ROOT/node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3"
OUT="$BSQ/build/Release"
NODE_FILE="$OUT/better_sqlite3.node"

if [ -f "$NODE_FILE" ]; then
  echo "better-sqlite3 already built, skipping"
  exit 0
fi

if [ ! -d "$BSQ" ]; then
  echo "better-sqlite3 package not found at $BSQ, skipping"
  exit 0
fi

echo "Rebuilding better-sqlite3 native module..."
mkdir -p "$OUT"
NODE_EXEC=$(node -e "console.log(process.execPath)")
NODE_INC="$(dirname $(dirname "$NODE_EXEC"))/include/node"

if [ ! -d "$NODE_INC" ]; then
  echo "Node headers not found at $NODE_INC, skipping"
  exit 0
fi

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
  -o "$OUT/better_sqlite3.node" && echo "better-sqlite3 rebuilt OK" || echo "better-sqlite3 build FAILED (non-fatal)"
