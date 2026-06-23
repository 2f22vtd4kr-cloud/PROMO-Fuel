#!/bin/bash
# Fast Python dependency check — run before supervisor on every cold start.
# Uses the pythonlibs Python (the one that actually has packages installed).
PY="/home/runner/workspace/.pythonlibs/bin/python3"

# Quick smoke-test: if all critical packages import, skip the full install
if "$PY" -c "import aiosqlite, filelock, fastapi, socks, python_socks, telethon, telegram" 2>/dev/null; then
  echo "[ensure-python-deps] All packages OK — skipping install"
  exit 0
fi

echo "[ensure-python-deps] Installing missing Python packages..."
"$PY" -m pip install -r requirements.txt --quiet 2>&1 | grep -v "already satisfied" || true
echo "[ensure-python-deps] Done."
