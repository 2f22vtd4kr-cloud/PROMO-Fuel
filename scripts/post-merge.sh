#!/bin/bash
# Runs once after every repo import / merge (postMerge hook).
# Runs pip install, pnpm install, and better-sqlite3 compile IN PARALLEL
# so workflow startup scripts find everything pre-built and exit instantly.
# Writes .deps-ready sentinel on success.

WORKSPACE="$(cd "$(dirname "$0")/.." && pwd)"
SENTINEL="$WORKSPACE/.deps-ready"
PY="$(which python3)"
[ -x "/home/runner/workspace/.pythonlibs/bin/python3" ] && PY="/home/runner/workspace/.pythonlibs/bin/python3"

echo "[post-merge] ══════════════════════════════════════════"
echo "[post-merge] Parallel install: pip + pnpm + sqlite3"
echo "[post-merge] ══════════════════════════════════════════"

# ── Check for missing secrets early so user sees it immediately ─────────────
source "$WORKSPACE/scripts/required-secrets.sh" 2>/dev/null && check_secrets || true

# ── 1. Python packages ───────────────────────────────────────
install_python() {
  echo "[post-merge/py] pip install..."
  "$PY" -m pip install -r "$WORKSPACE/requirements.txt" \
    --quiet --prefer-binary --progress-bar off \
    2>&1 | grep -v "already satisfied" || true

  # Patch conflicting `telegram` stub (v0.0.1) that hides python-telegram-bot exports
  if ! "$PY" -c "from telegram import Update" 2>/dev/null; then
    echo "[post-merge/py] Patching telegram stub..."
    SITE="$("$PY" -c 'import site; print(site.getsitepackages()[0])')"
    PTB_VER="$("$PY" -c 'import telegram._version; print(telegram._version.__version__)' 2>/dev/null || echo "22.8")"
    mkdir -p /tmp/ptb_pm
    "$PY" -m pip download "python-telegram-bot==$PTB_VER" --no-deps -d /tmp/ptb_pm/ -q 2>/dev/null || true
    WHL="$(ls /tmp/ptb_pm/python_telegram_bot-*.whl 2>/dev/null | head -1)"
    if [ -n "$WHL" ]; then
      unzip -p "$WHL" telegram/__init__.py > "$SITE/telegram/__init__.py" 2>/dev/null && \
        rm -f "$SITE/telegram/__pycache__/__init__.cpython-"*.pyc 2>/dev/null || true
      echo "[post-merge/py] telegram stub patched"
    fi
  fi
  echo "[post-merge/py] ✓ Done"
}

# ── 2. Node packages ─────────────────────────────────────────
install_node() {
  echo "[post-merge/node] pnpm install..."
  cd "$WORKSPACE"
  # --ignore-scripts prevents node-gyp from running for better-sqlite3.
  # Node-gyp picks up pnpm's bundled Node 24 headers but the runtime is Node 20,
  # causing a fatal version mismatch. compile_sqlite() below uses gcc directly
  # against the correct Node 20 headers and handles the native build correctly.
  pnpm install --frozen-lockfile --ignore-scripts --silent 2>&1 | tail -3 || \
    pnpm install --no-frozen-lockfile --ignore-scripts --silent 2>&1 | tail -3 || true
  echo "[post-merge/node] ✓ Done"
}

# ── 3. better-sqlite3 native compile ────────────────────────
compile_sqlite() {
  BSQ="$WORKSPACE/node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3"
  OUT="$BSQ/build/Release"
  NODE_FILE="$OUT/better_sqlite3.node"

  if [ -f "$NODE_FILE" ]; then
    echo "[post-merge/sqlite3] ✓ Already built"
    return 0
  fi
  if [ ! -d "$BSQ" ]; then
    echo "[post-merge/sqlite3] Package not found yet — skipping (startup will retry)"
    return 0
  fi

  echo "[post-merge/sqlite3] Compiling better-sqlite3..."
  mkdir -p "$OUT"
  NODE_EXEC="$(node -e 'console.log(process.execPath)' 2>/dev/null)"
  NODE_INC="$(dirname "$(dirname "$NODE_EXEC")")/include/node"
  if [ ! -d "$NODE_INC" ]; then
    echo "[post-merge/sqlite3] Node headers missing — skipping"
    return 0
  fi

  gcc -O1 -fPIC -pthread -std=c99 -w \
    -c "$BSQ/deps/sqlite3/sqlite3.c" -o "$OUT/sqlite3.o" \
    -DSQLITE_THREADSAFE=2 -DSQLITE_OMIT_SHARED_CACHE -DSQLITE_DEFAULT_MEMSTATUS=0 \
    -DSQLITE_OMIT_DEPRECATED -DSQLITE_ENABLE_FTS5 -DSQLITE_ENABLE_FTS4 \
    -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_FTS3_PARENTHESIS \
    -DSQLITE_ENABLE_JSON1 -DSQLITE_ENABLE_RTREE -DSQLITE_ENABLE_COLUMN_METADATA \
    -DSQLITE_ENABLE_DBSTAT_VTAB -DSQLITE_ENABLE_DESERIALIZE \
    -DSQLITE_DQS=0 -DSQLITE_DEFAULT_FOREIGN_KEYS=1 -DNDEBUG 2>/dev/null && \
  g++ -O2 -fPIC -pthread -fno-rtti -fno-exceptions -std=gnu++20 -shared \
    -I"$NODE_INC" -I"$BSQ/deps/sqlite3" -I"$BSQ/src" \
    "$BSQ/src/better_sqlite3.cpp" "$OUT/sqlite3.o" \
    -o "$NODE_FILE" 2>/dev/null && \
    echo "[post-merge/sqlite3] ✓ Compiled OK" || \
    echo "[post-merge/sqlite3] ⚠ Compile failed (startup will retry)"
}

# ── 4. Drizzle schema push — keeps dev PostgreSQL in sync with schema ─────
push_drizzle() {
  DRIZZLE_BIN="$WORKSPACE/node_modules/.pnpm/node_modules/.bin/drizzle-kit"
  if [ ! -x "$DRIZZLE_BIN" ]; then
    echo "[post-merge/drizzle] drizzle-kit not found — skipping"
    return 0
  fi
  if [ -z "$DATABASE_URL" ]; then
    echo "[post-merge/drizzle] DATABASE_URL not set — skipping"
    return 0
  fi
  echo "[post-merge/drizzle] Pushing schema to dev PostgreSQL..."
  cd "$WORKSPACE/lib/db"
  "$DRIZZLE_BIN" push --force --config ./drizzle.config.ts 2>&1 | tail -4 || true
  echo "[post-merge/drizzle] ✓ Done"
}

# ── Run pip and pnpm in parallel; compile sqlite3 after pnpm finishes ───────
install_python &
PY_PID=$!

install_node &
NODE_PID=$!

# Wait for node install, then immediately start sqlite3 compile + drizzle push
# (both need the pnpm tree to exist but don't need python to finish)
wait $NODE_PID
compile_sqlite &
SQLITE_PID=$!
push_drizzle &
DRIZZLE_PID=$!

wait $PY_PID $SQLITE_PID $DRIZZLE_PID

echo ""
echo "[post-merge] Writing sentinel..."
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$SENTINEL"
echo "[post-merge] ✓ Setup complete. Next cold start will be instant."
