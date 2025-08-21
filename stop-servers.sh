#!/bin/bash

# AI Engineer Challenge - Server Stop Script
echo "🛑 Stopping AI Engineer Challenge servers..."

# Kill the tmux session
tmux kill-session -t ai-challenge 2>/dev/null

echo "✅ Servers stopped successfully!"
echo ""
echo "To restart servers, run: ./start-servers.sh"
