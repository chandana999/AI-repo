#!/bin/bash

# AI Engineer Challenge - Server Startup Script
echo "🚀 Starting AI Engineer Challenge servers..."

# Kill any existing tmux session
tmux kill-session -t ai-challenge 2>/dev/null

# Create new tmux session
tmux new-session -d -s ai-challenge

# Start backend server in first window
echo "📡 Starting backend server..."
tmux send-keys -t ai-challenge "cd api && source venv/bin/activate && python3 app.py" C-m

# Create new window for frontend
tmux new-window -t ai-challenge -n frontend

# Start frontend server in second window
echo "🎨 Starting frontend server..."
tmux send-keys -t ai-challenge:frontend "cd frontend && npm run dev" C-m

# List the session
echo "✅ Servers started in tmux session 'ai-challenge'"
echo ""
echo "📋 Commands to manage your servers:"
echo "  • View servers: tmux attach-session -t ai-challenge"
echo "  • Switch windows: Ctrl+B then 0 (backend) or 1 (frontend)"
echo "  • Detach from session: Ctrl+B then D"
echo "  • Stop servers: tmux kill-session -t ai-challenge"
echo ""
echo "🌐 Your application is available at:"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend API: http://localhost:8000"
echo "  • Health check: http://localhost:8000/api/health"
echo ""
echo "Press Enter to attach to the tmux session..."
read
tmux attach-session -t ai-challenge
