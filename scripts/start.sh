#!/bin/bash
# Production entry point for PROMO-Fuel (autoscale deployment)
#
# Starts two services:
#   1. Node.js Express  — serves built Mini App + /api/* routes — FOREGROUND (port 8080)
#   2. python3 supervisor.py  — DB migrations, PTB bot, broadcast workers,
#                               Telethon auth FastAPI (port 8083) — BACKGROUND
#
# CRITICAL ORDERING: Node.js must start FIRST so the deployment healthcheck
# at /health passes immediately.  If Python starts first and we wait for port
# 8083 before launching Node, the healthcheck times out and the deployment is
# marked as failed before the server ever starts.
#
# The factory proxy (/api/factory/*) already handles ECONNREFUSED from 8083
# gracefully — it returns {"error":"Python API unavailable"} with 503 rather
# than crashing — so it's safe to accept requests before Python is ready.
#
# Replit autoscale routes public traffic to PORT (default 8080).

set -e

echo "=== PROMO-Fuel Production Start ==="

# ── 1. Ensure Python packages are installed ───────────────────────────────────
echo "Checking Python dependencies..."
python3 -c "import aiosqlite, filelock, fastapi, telethon, uvicorn" 2>/dev/null || {
  echo "Installing Python dependencies..."
  pip install -q aiosqlite filelock python-telegram-bot telethon fastapi \
    "uvicorn[standard]" aiohttp pydantic requests 2>&1 || true
}

# ── 2. Start Python supervisor in the background ──────────────────────────────
echo "Starting Python supervisor (background)..."
python3 supervisor.py &
SUPERVISOR_PID=$!

# Graceful shutdown: forward SIGTERM to supervisor before Node exits
trap "echo 'Shutting down supervisor...'; kill $SUPERVISOR_PID 2>/dev/null; wait $SUPERVISOR_PID 2>/dev/null" EXIT SIGTERM SIGINT

# ── 3. Start Node.js Express IMMEDIATELY ──────────────────────────────────────
# Do NOT wait for Python port 8083 here — that would block the healthcheck.
# Express already handles the ECONNREFUSED case gracefully (returns 503).
echo "Starting Node.js API server (foreground, port ${PORT:-8080})..."
exec node --enable-source-maps ./artifacts/api-server/dist/index.mjs
