#!/bin/bash
# Runs before supervisor on every cold start.
# Fast path: if all critical packages import OK, skip pip install entirely.
# Slow path: runs pip install, then re-verifies — screams if anything is still missing.

PY="/home/runner/workspace/.pythonlibs/bin/python3"

# Fallback: if .pythonlibs python doesn't exist yet, use whatever python3 is in PATH
if [ ! -x "$PY" ]; then
  PY="$(which python3)"
fi

CRITICAL_IMPORTS="aiosqlite, filelock, fastapi, socks, python_socks, telethon, telegram"

smoke_test() {
  "$PY" -c "import $CRITICAL_IMPORTS" 2>/dev/null
}

if smoke_test; then
  echo "[ensure-python-deps] ✓ All packages OK — skipping install"
  exit 0
fi

echo "[ensure-python-deps] Missing packages detected — running pip install..."
"$PY" -m pip install -r requirements.txt --quiet 2>&1 | grep -v "already satisfied" || true

# Post-install verification — fail loudly if anything is still broken
if ! smoke_test; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ⛔  CRITICAL: Python packages failed to install             ║"
  echo "║                                                              ║"
  echo "║  Telethon WILL silently ignore proxies → SentCodeTypeApp     ║"
  echo "║  on every registration → burns SMSPool balance for nothing.  ║"
  echo "║                                                              ║"
  echo "║  Run manually:                                               ║"
  echo "║    .pythonlibs/bin/python3 -m pip install -r requirements.txt║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  # Check each package individually so the user knows exactly what's missing
  for pkg in aiosqlite filelock fastapi socks python_socks telethon telegram; do
    if ! "$PY" -c "import $pkg" 2>/dev/null; then
      echo "  ✗ MISSING: $pkg"
    else
      echo "  ✓ OK:      $pkg"
    fi
  done
  echo ""
  # Don't exit 1 — let the supervisor start anyway (bot works; factory will abort safely)
fi

echo "[ensure-python-deps] Done."
