#!/bin/bash
# Verilog EDA Studio Launcher
# Usage: ./launch.sh [PORT]

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT=${1:-4500}

echo "⚡ Starting Verilog EDA Studio on port $PORT..."

# Start node server in background if not already running on that port
if ! lsof -i :$PORT >/dev/null 2>&1; then
    PORT=$PORT node server.js &
    SERVER_PID=$!
    sleep 1
fi

echo "🚀 Opening browser at http://localhost:$PORT ..."
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:$PORT" >/dev/null 2>&1 &
elif command -v google-chrome >/dev/null 2>&1; then
    google-chrome "http://localhost:$PORT" >/dev/null 2>&1 &
fi

echo "Verilog EDA Studio is live! Press Ctrl+C in terminal when done or leave it running in background."
