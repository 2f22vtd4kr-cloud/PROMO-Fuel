#!/bin/bash
# Runs before supervisor on every cold start.
#
# Fast path A — sentinel: post-merge.sh completed successfully and all imports OK → instant exit.
# Fast path B — smoke test: packages already installed (e.g. repeated restart) → instant exit.
# Slow path   — pip install: fresh import or missing packages → install, fix stub, exit.
#
# CRITICAL FOR ACCOUNT FACTORY:
#   Telethon needs python-socks[asyncio] (python_socks.async_.asyncio.Proxy).
#   WITHOUT IT Telethon silently ignores the proxy → datacenter IP →
#   Telegram returns SentCodeTypeApp on EVERY number → wasted SMSPool balance.

PY="$(which python3)"
[ -x "/home/runner/workspace/.pythonlibs/bin/python3" ] && PY="/home/runner/workspace/.pythonlibs/bin/python3"

SENTINEL="$(cd "$(dirname "$0")/.." && pwd)/.deps-ready"

# ── Smoke test: imports that must ALL succeed ────────────────
smoke_test() {
  "$PY" -c "
from telegram import Update
import aiosqlite, filelock, fastapi, socks, python_socks, telethon, psycopg2
from python_socks.async_.asyncio import Proxy as _P
from python_socks import ProxyType as _PT
assert _PT.SOCKS5 is not None
" 2>/dev/null
}

# ── Fast path A: sentinel written by post-merge → trust it, skip everything ──
if [ -f "$SENTINEL" ]; then
  echo "[ensure-python-deps] ✓ .deps-ready sentinel found — skipping install"
  exit 0
fi

# ── Fast path B: no sentinel but smoke test already passes ───
if smoke_test; then
  echo "[ensure-python-deps] ✓ All packages OK — skipping install"
  exit 0
fi

# ── Slow path: install missing packages ─────────────────────
echo "[ensure-python-deps] Installing packages..."
"$PY" -m pip install -r requirements.txt \
  --quiet --prefer-binary --progress-bar off \
  2>&1 | grep -v "already satisfied" || true

# ── Fix conflicting `telegram` stub (v0.0.1) that shadows python-telegram-bot ──
# Detected when `from telegram import Update` fails even after pip install.
# The stub package has a 3-line __init__.py that hides all real PTB exports.
if ! "$PY" -c "from telegram import Update" 2>/dev/null; then
  echo "[ensure-python-deps] Patching telegram stub..."
  SITE="$("$PY" -c 'import site; print(site.getsitepackages()[0])')"
  PTB_VER="$("$PY" -c 'import telegram._version; print(telegram._version.__version__)' 2>/dev/null || echo "22.8")"
  mkdir -p /tmp/ptb_fix
  "$PY" -m pip download "python-telegram-bot==$PTB_VER" --no-deps -d /tmp/ptb_fix/ -q 2>/dev/null || true
  WHL="$(ls /tmp/ptb_fix/python_telegram_bot-*.whl 2>/dev/null | head -1)"
  if [ -n "$WHL" ]; then
    unzip -p "$WHL" telegram/__init__.py > "$SITE/telegram/__init__.py" 2>/dev/null && \
      rm -f "$SITE/telegram/__pycache__/__init__.cpython-"*.pyc 2>/dev/null || true
    echo "[ensure-python-deps] telegram stub patched"
  fi
fi

# ── Post-install verification ────────────────────────────────
if ! smoke_test; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ⛔  CRITICAL: Python packages failed to install             ║"
  echo "║                                                              ║"
  echo "║  Run manually:                                               ║"
  echo "║    .pythonlibs/bin/python3 -m pip install -r requirements.txt║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  for pkg in aiosqlite filelock fastapi socks python_socks telethon telegram; do
    "$PY" -c "import $pkg" 2>/dev/null && echo "  ✓ $pkg" || echo "  ✗ MISSING: $pkg"
  done
  if "$PY" -c "import python_socks" 2>/dev/null; then
    "$PY" -c "from python_socks.async_.asyncio import Proxy" 2>/dev/null && \
      echo "  ✓ python_socks.async_.asyncio.Proxy" || \
      echo "  ✗ CRITICAL: python-socks installed WITHOUT [asyncio] extra. Fix: pip install 'python-socks[asyncio]>=2.8.2'"
  fi
fi

echo "[ensure-python-deps] Done."
