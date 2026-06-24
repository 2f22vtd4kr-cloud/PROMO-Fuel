#!/bin/bash
# Production entry point for PROMO-Fuel (autoscale deployment)
#
# Starts two services:
#   1. python3 supervisor.py  — DB migrations, PTB bot, broadcast workers,
#                               Telethon auth FastAPI (port 8083) — background
#   2. Node.js Express        — serves built Mini App static files + /api/*
#                               routes, proxies Telethon auth to 8083 — foreground
#
# Replit autoscale routes public traffic to PORT (default 8080).

set -e

echo "=== PROMO-Fuel Production Start ==="

# Ensure Python packages are installed (production container may be fresh)
echo "Checking Python dependencies..."
python3 -c "import aiosqlite, filelock, fastapi, telethon, uvicorn" 2>/dev/null || {
  echo "Installing Python dependencies..."
  pip install -q aiosqlite filelock python-telegram-bot telethon fastapi \
    "uvicorn[standard]" aiohttp pydantic requests 2>&1 || true
}

# Start Python supervisor in background:
#   - runs DB migrations
#   - spawns PTB Telegram bot (long-polling — requires always-running VM)
#   - spawns broadcast worker processes
#   - starts Telethon auth FastAPI on port 8083
echo "Starting Python supervisor (background)..."
python3 supervisor.py &
SUPERVISOR_PID=$!

# Graceful shutdown: forward SIGTERM to supervisor before Node exits
trap "echo 'Shutting down supervisor...'; kill $SUPERVISOR_PID 2>/dev/null; wait $SUPERVISOR_PID 2>/dev/null" EXIT SIGTERM SIGINT

# Wait for Python FastAPI (port 8083) to be ready before accepting proxied requests.
# Without this, early requests to /api/factory/* get ECONNREFUSED → "Python API unavailable".
echo "Waiting for Python API on port 8083..."
for i in $(seq 1 30); do
  if python3 -c "import socket; s=socket.create_connection(('127.0.0.1',8083),timeout=1); s.close()" 2>/dev/null; then
    echo "Python API ready (${i}s)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "WARNING: Python API not ready after 30s — starting Node.js anyway"
  fi
  sleep 1
done

# Start Node.js Express server in the foreground on ${PORT:-8080}.
# Express serves the built Mini App HTML/JS/CSS and all /api/* routes.
# Telethon auth calls (/api/auth/*) are internally proxied to localhost:8083.
echo "Starting Node.js API server (foreground, port ${PORT:-8080})..."
exec node --enable-source-maps ./artifacts/api-server/dist/index.mjs
