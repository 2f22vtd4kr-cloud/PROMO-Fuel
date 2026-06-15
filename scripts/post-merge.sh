#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Rebuild better-sqlite3 native module for the current Node.js version
BSQ="$(pwd)/node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3"
if [ -d "$BSQ" ]; then
  echo "Rebuilding better-sqlite3 native module..."
  NODE_VER=$(node -e "console.log(process.version.slice(1))")
  NODE_CACHE="$HOME/.cache/node-gyp/$NODE_VER"
  OUT="$BSQ/build/Release"
  mkdir -p "$OUT"

  # Fix node-gyp cache version in Makefiles if needed
  if [ -d "$BSQ/build" ]; then
    OLD_VER=$(grep -o 'node-gyp/[0-9.]*' "$BSQ/build/deps/sqlite3.target.mk" 2>/dev/null | head -1 | cut -d/ -f2 || true)
    if [ -n "$OLD_VER" ] && [ "$OLD_VER" != "$NODE_VER" ]; then
      sed -i "s|node-gyp/$OLD_VER|node-gyp/$NODE_VER|g" \
        "$BSQ/build/deps/sqlite3.target.mk" \
        "$BSQ/build/better_sqlite3.target.mk" \
        "$BSQ/build/binding.Makefile" \
        "$BSQ/build/Makefile" 2>/dev/null || true
    fi
  fi

  # First fetch node headers if not present
  if [ ! -d "$NODE_CACHE/include/node" ]; then
    node-gyp install "$NODE_VER" 2>/dev/null || true
  fi

  if [ -d "$NODE_CACHE/include/node" ]; then
    # Compile sqlite3 amalgamation (THREADSAFE=2 = multi-thread mode, required by better-sqlite3)
    gcc -O1 -fPIC -pthread -std=c99 -w \
      -c "$BSQ/deps/sqlite3/sqlite3.c" -o "$OUT/sqlite3.o" \
      -DSQLITE_THREADSAFE=2 -DSQLITE_OMIT_SHARED_CACHE -DSQLITE_DEFAULT_MEMSTATUS=0 \
      -DSQLITE_OMIT_DEPRECATED -DSQLITE_ENABLE_FTS5 -DSQLITE_ENABLE_FTS4 \
      -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_FTS3_PARENTHESIS \
      -DSQLITE_ENABLE_JSON1 -DSQLITE_ENABLE_RTREE -DSQLITE_ENABLE_COLUMN_METADATA \
      -DSQLITE_ENABLE_DBSTAT_VTAB -DSQLITE_ENABLE_DESERIALIZE \
      -DSQLITE_DQS=0 -DSQLITE_DEFAULT_FOREIGN_KEYS=1 -DNDEBUG 2>&1 || true

    # Compile the Node.js addon
    g++ -O2 -fPIC -pthread -fno-rtti -fno-exceptions -std=gnu++20 -shared \
      -I"$NODE_CACHE/include/node" \
      -I"$NODE_CACHE/deps/openssl/openssl/include" \
      -I"$NODE_CACHE/deps/uv/include" \
      -I"$NODE_CACHE/deps/v8/include" \
      -I"$BSQ/deps/sqlite3" \
      -I"$BSQ/src" \
      "$BSQ/src/better_sqlite3.cpp" \
      "$OUT/sqlite3.o" \
      -o "$OUT/better_sqlite3.node" 2>&1 && echo "better-sqlite3 rebuilt OK" || echo "better-sqlite3 build failed (non-fatal)"
  else
    echo "Node headers not found, skipping better-sqlite3 rebuild"
  fi
fi
