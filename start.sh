#!/usr/bin/env bash
# Start HJC dev environment + Claude session.
# Opens 3 Terminal tabs in a single window:
#   1. Laravel backend on :8001
#   2. Vite frontend on :5173
#   3. Claude CLI in the project root
#
# Usage:  ./start.sh
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Kill any stale dev processes from a previous run so the ports are free.
pkill -f "artisan serve --port=8001" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

osascript <<APPLESCRIPT
tell application "Terminal"
  activate

  -- Tab 1: backend
  do script "echo '🐘 HJC backend (Laravel :8001)' && cd '$PROJECT_DIR' && php artisan serve --port=8001"

  -- Tab 2: frontend (new tab in the same front window)
  tell application "System Events" to keystroke "t" using command down
  delay 0.4
  do script "echo '⚡ HJC frontend (Vite :5173)' && cd '$PROJECT_DIR/web' && npm run dev" in front window

  -- Tab 3: Claude session in project root
  tell application "System Events" to keystroke "t" using command down
  delay 0.4
  do script "echo '🤖 Claude session (project: HJC)' && cd '$PROJECT_DIR' && claude" in front window
end tell
APPLESCRIPT

echo "✅ HJC dev environment starting in 3 Terminal tabs."
echo "   Backend:  http://localhost:8001"
echo "   Frontend: http://localhost:5173"
echo "   Login:    director@hjc.test / password"
