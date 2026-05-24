#!/usr/bin/env bash
# launch.sh — Build and start Let's Go! under PM2 (Mac/Linux)
#
# Usage:
#   chmod +x scripts/launch.sh   # one-time, make it executable
#   ./scripts/launch.sh

set -e  # exit immediately on any error

# Always operate from the project root, regardless of where this script was called from
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo ""
echo "🗺️  Let's Go! — Launch Script"
echo "================================"
echo "Project root: $ROOT_DIR"
echo ""

# ── 1. Install dependencies ───────────────────────────────────────────────────
echo "📦  Installing dependencies..."
npm install
npm install --prefix server
npm install --prefix client

# ── 2. Build client ───────────────────────────────────────────────────────────
echo ""
echo "🔨  Building client (Vite)..."
npm run build

# ── 3. Start with PM2 ─────────────────────────────────────────────────────────
echo ""
echo "🚀  Starting PM2..."
pm2 start ecosystem.config.js

# ── 4. Save process list (survives reboots) ───────────────────────────────────
echo ""
echo "💾  Saving PM2 process list..."
pm2 save

# ── 5. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "✅  Let's Go! is running!"
echo ""
echo "   Local:       http://localhost:3001"
echo "   Status page: http://localhost:3001/status"
echo "   PM2 logs:    npm run pm2:logs"
echo "   PM2 status:  npm run pm2:status"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "To expose publicly via Cloudflare (no account needed):"
echo "   cloudflared tunnel --url http://localhost:3001"
echo ""
echo "Or with a named tunnel (see cloudflared/setup.md):"
echo "   cloudflared tunnel run lets-go"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Reminder about pm2 startup (requires sudo, so we can't run it automatically)
echo "⚠️  To make PM2 survive reboots, run this one-time command:"
echo "   pm2 startup"
echo "   (then copy-paste and run the command it outputs)"
echo ""
