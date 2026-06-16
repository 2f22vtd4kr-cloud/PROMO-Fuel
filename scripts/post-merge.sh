#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Fix missing .bin symlinks for vite in workspace packages
# pnpm stores vite in node_modules/.pnpm/node_modules/.bin/vite
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

# Rebuild better-sqlite3 native module for the current Node.js version
BSQ="$(pwd)/node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3"
if [ -d "$BSQ" ]; then
  echo "Rebuilding better-sqlite3 native module..."
  OUT="$BSQ/build/Release"
  mkdir -p "$OUT"

  # Find Node.js include headers from nix store
  NODE_EXEC=$(node -e "console.log(process.execPath)")
  NODE_NIX_DIR=$(dirname $(dirname "$NODE_EXEC"))
  NODE_INC="$NODE_NIX_DIR/include/node"

  if [ -d "$NODE_INC" ]; then
    # Compile sqlite3 amalgamation (THREADSAFE=2 = multi-thread mode, required by better-sqlite3)
    gcc -O1 -fPIC -pthread -std=c99 -w \
      -c "$BSQ/deps/sqlite3/sqlite3.c" -o "$OUT/sqlite3.o" \
      -DSQLITE_THREADSAFE=2 -DSQLITE_OMIT_SHARED_CACHE -DSQLITE_DEFAULT_MEMSTATUS=0 \
      -DSQLITE_OMIT_DEPRECATED -DSQLITE_ENABLE_FTS5 -DSQLITE_ENABLE_FTS4 \
      -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_FTS3_PARENTHESIS \
      -DSQLITE_ENABLE_JSON1 -DSQLITE_ENABLE_RTREE -DSQLITE_ENABLE_COLUMN_METADATA \
      -DSQLITE_ENABLE_DBSTAT_VTAB -DSQLITE_ENABLE_DESERIALIZE \
      -DSQLITE_DQS=0 -DSQLITE_DEFAULT_FOREIGN_KEYS=1 -DNDEBUG 2>&1 || true

    # Compile the Node.js addon using nix node headers
    g++ -O2 -fPIC -pthread -fno-rtti -fno-exceptions -std=gnu++20 -shared \
      -I"$NODE_INC" \
      -I"$BSQ/deps/sqlite3" \
      -I"$BSQ/src" \
      "$BSQ/src/better_sqlite3.cpp" \
      "$OUT/sqlite3.o" \
      -o "$OUT/better_sqlite3.node" 2>&1 && echo "better-sqlite3 rebuilt OK" || echo "better-sqlite3 build failed (non-fatal)"
  else
    echo "Node headers not found at $NODE_INC, skipping better-sqlite3 rebuild"
  fi
fi

# Install Python dependencies
if [ -f "pyproject.toml" ]; then
  echo "Installing Python dependencies..."
  uv sync 2>&1 && echo "Python deps installed OK" || echo "Python deps install failed (non-fatal)"
fi
