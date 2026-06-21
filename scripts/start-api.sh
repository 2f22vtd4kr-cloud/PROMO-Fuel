#!/bin/bash
set -e

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting API server..."

BSQ="$WORKSPACE_ROOT/node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3"
NATIVE="$BSQ/build/Release/better_sqlite3.node"

NODE_MODULE_VERSION=$(node -e "console.log(process.versions.modules)")
NEED_REBUILD=false

if [ ! -f "$NATIVE" ]; then
  NEED_REBUILD=true
  echo "Building better-sqlite3 native module (binary missing)..."
else
  COMPILED_NMV=$(node -e "try { require('$NATIVE'); console.log(process.versions.modules); } catch(e) { const m = e.message.match(/NODE_MODULE_VERSION (\\d+)/); console.log(m ? m[1] : '0'); }" 2>/dev/null || echo "0")
  if [ "$COMPILED_NMV" != "$NODE_MODULE_VERSION" ]; then
    NEED_REBUILD=true
    echo "Building better-sqlite3 native module (version mismatch: compiled=$COMPILED_NMV, required=$NODE_MODULE_VERSION)..."
    rm -f "$NATIVE" "$BSQ/build/Release/sqlite3.o"
  fi
fi

if [ "$NEED_REBUILD" = "true" ]; then
  mkdir -p "$BSQ/build/Release"
  NODE_EXEC=$(node -e "console.log(process.execPath)")
  NODE_INC="$(dirname $(dirname "$NODE_EXEC"))/include/node"

  gcc -O1 -fPIC -pthread -std=c99 -w \
    -c "$BSQ/deps/sqlite3/sqlite3.c" -o "$BSQ/build/Release/sqlite3.o" \
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
    "$BSQ/build/Release/sqlite3.o" \
    -o "$NATIVE"

  echo "better-sqlite3 built OK"
fi

API_DIST="$WORKSPACE_ROOT/artifacts/api-server/dist/index.mjs"

if [ ! -f "$API_DIST" ]; then
  echo "Building API server..."
  cd "$WORKSPACE_ROOT/artifacts/api-server" && NODE_ENV=development node build.mjs
fi

exec node --enable-source-maps "$API_DIST"
