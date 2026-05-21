#!/usr/bin/env bash
# Signal — one command to start everything cleanly
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "→ Clearing stale processes on ports 4000 and 5173..."
lsof -ti :4000 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true
sleep 1

echo "→ Starting backend (port 4000)..."
cd "$ROOT/apps/backend"
npm run dev &
BACKEND_PID=$!

echo "→ Starting frontend (port 5173)..."
cd "$ROOT/apps/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Backend  → http://localhost:4000"
echo "✓ Frontend → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."

# Forward Ctrl+C to both children
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
