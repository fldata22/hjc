#!/usr/bin/env bash
# Stop HJC dev environment (kills backend + frontend; leaves Claude session alone).
# Usage:  ./stop.sh
pkill -f "artisan serve --port=8001" 2>/dev/null && echo "🐘 backend stopped" || echo "🐘 backend not running"
pkill -f "vite" 2>/dev/null && echo "⚡ frontend stopped" || echo "⚡ frontend not running"
pkill -f "cloudflared tunnel" 2>/dev/null && echo "☁️  cloudflared tunnel stopped" || true
pkill -f "lt --port" 2>/dev/null && echo "🌐 localtunnel stopped" || true
