## 👋 AI Engineer Challenge

Build a streaming chat app with a FastAPI backend and a Next.js frontend. Friendly vibes, real-time tokens. Let’s ship. 🚀

### TL;DR
- What: FastAPI streaming backend + Next.js chat UI
- Why: Learn the end-to-end path to a dope LLM app
- Run: backend `cd api && pip install -r requirements.txt && python app.py`; frontend `cd frontend && npm i && npm run dev`

### Quickstart
```bash
# Backend
cd app-challenge/The-AI-Engineer-Challenge/api
python -m venv venv
source venv/bin/activate  # Windows: ./venv/Scripts/Activate.ps1
pip install -r requirements.txt
python app.py
# http://localhost:8000

# Frontend
cd ../frontend
npm install
npm run dev
# http://localhost:3000
```

### Features
- ⚡ Streaming chat over `/api/chat`
- 🎛️ Model selection and system prompts (frontend)
- 🌐 CORS enabled for local dev
- 🧪 `/api/health` for quick checks

### Configure
- OpenAI API key is passed per-request in the backend body as `api_key`
- Frontend expects backend at `http://localhost:8000`

### Deploy
- Frontend: Vercel works great (`npm run build` then `vercel`)
- Backend: host separately (Render/Fly/EC2). Point frontend to the public API URL

### Troubleshooting
- Backend import errors: activate venv and install deps
- 401/invalid key: verify `api_key` in request body
- CORS errors: tighten/adjust `allow_origins` in `api/app.py`
- Frontend can’t connect: ensure backend is running at the configured URL

### License
Part of the AI Engineer Challenge by AI Makerspace.
