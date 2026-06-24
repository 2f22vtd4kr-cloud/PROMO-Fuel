#!/bin/bash
# Runs before supervisor on every cold start.
# Fast path: if all critical packages import OK, skip pip install entirely.
# Slow path: runs pip install, then re-verifies — screams if anything is still missing.
#
# CRITICAL FOR ACCOUNT FACTORY:
#   Telethon needs python-socks[asyncio] (python_socks.async_.asyncio.Proxy).
#   WITHOUT IT Telethon silently ignores the proxy and connects from the
#   datacenter IP → Telegram returns SentCodeTypeApp on EVERY number.
#   PySocks (the `socks` package) is a completely different package and does
#   NOT satisfy this requirement.

PY="/home/runner/workspace/.pythonlibs/bin/python3"

# Fallback: if .pythonlibs python doesn't exist yet, use whatever python3 is in PATH
if [ ! -x "$PY" ]; then
  PY="$(which python3)"
fi

# ── Smoke test: imports that must ALL succeed ────────────────────────────────
smoke_test() {
  "$PY" -c "
import aiosqlite, filelock, fastapi, socks, python_socks, telethon, telegram
# The one that actually matters for Telethon proxy routing:
from python_socks.async_.asyncio import Proxy as _P
from python_socks import ProxyType as _PT
assert _PT.SOCKS5 is not None
" 2>/dev/null
}

# ── Fix conflicting stub `telegram` package (v0.0.1) that shadows python-telegram-bot ──
# The old `telegram` stub package installs a 3-line __init__.py that hides all real
# python-telegram-bot exports (Update, InlineKeyboardButton, etc.).
# We detect it by checking if `from telegram import Update` fails, then replace the
# stub __init__ with the real one extracted from the installed python-telegram-bot wheel.
fix_telegram_stub() {
  if ! "$PY" -c "from telegram import Update" 2>/dev/null; then
    echo "[ensure-python-deps] Fixing conflicting telegram stub package..."
    SITE="$("$PY" -c 'import site; print(site.getsitepackages()[0])')"
    INIT="$SITE/telegram/__init__.py"
    # Download and extract the real __init__.py from the python-telegram-bot wheel
    PTB_VERSION="$("$PY" -c 'import telegram._version; print(telegram._version.__version__)' 2>/dev/null || echo "22.8")"
    TMP_WHL="/tmp/ptb_fix_$$.whl"
    "$PY" -m pip download "python-telegram-bot==$PTB_VERSION" --no-deps -d /tmp/ -q 2>/dev/null && \
      WHL=$(ls /tmp/python_telegram_bot-*.whl 2>/dev/null | head -1) && \
      [ -n "$WHL" ] && \
      unzip -p "$WHL" telegram/__init__.py > "$INIT" && \
      rm -f "${SITE}/telegram/__pycache__/__init__.cpython-"*.pyc 2>/dev/null || true
    echo "[ensure-python-deps] telegram stub patched."
  fi
}
fix_telegram_stub

if smoke_test; then
  echo "[ensure-python-deps] ✓ All packages OK (including python_socks.async_.asyncio) — skipping install"
  exit 0
fi

echo "[ensure-python-deps] Missing or broken packages detected — running pip install..."
"$PY" -m pip install -r requirements.txt --quiet 2>&1 | grep -v "already satisfied" || true

# Post-install verification — fail loudly if anything is still broken
if ! smoke_test; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ⛔  CRITICAL: Python packages failed to install             ║"
  echo "║                                                              ║"
  echo "║  Telethon proxy chain is BROKEN:                             ║"
  echo "║  Without python-socks[asyncio], Telethon silently ignores   ║"
  echo "║  your proxy → all registrations exit from datacenter IP     ║"
  echo "║  → SentCodeTypeApp on every number → wasted SMSPool money.  ║"
  echo "║                                                              ║"
  echo "║  Run manually:                                               ║"
  echo "║    .pythonlibs/bin/python3 -m pip install -r requirements.txt║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Per-package audit:"
  for pkg in aiosqlite filelock fastapi socks python_socks telethon telegram; do
    if ! "$PY" -c "import $pkg" 2>/dev/null; then
      echo "  ✗ MISSING: $pkg"
    else
      echo "  ✓ OK:      $pkg"
    fi
  done
  echo ""
  # Specifically test the asyncio path — most likely failure point
  if "$PY" -c "import python_socks" 2>/dev/null; then
    if ! "$PY" -c "from python_socks.async_.asyncio import Proxy" 2>/dev/null; then
      echo "  ✗ CRITICAL: python_socks installed but async_.asyncio.Proxy missing"
      echo "              This means python-socks was installed WITHOUT [asyncio] extra."
      echo "              Fix: pip install 'python-socks[asyncio]>=2.8.2'"
    else
      echo "  ✓ OK:      python_socks.async_.asyncio.Proxy (Telethon proxy path)"
    fi
  fi
  echo ""
  # Don't exit 1 — let the supervisor start anyway (bot works; factory will abort safely
  # because the asyncio preflight gate will catch the broken proxy and stop before
  # spending any SMSPool balance)
fi

echo "[ensure-python-deps] Done."
