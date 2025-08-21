## AI Engineer Challenge Frontend

Vibe-coded Next.js app that chats with your FastAPI backend in real time. Clean UI, smooth streams, and a friendly UX. ✨

### TL;DR
- What: Next.js + Tailwind chat UI
- Why: Beautiful UX + streaming responses
- Run: `cd frontend && npm install && npm run dev`

### Features
- ⚡ Real-time streaming responses
- 🔐 Password-style API key input (no plain text)
- 🎛️ Model selection + system prompt controls
- 📱 Responsive layout with smooth animations

### Quickstart
```bash
cd app-challenge/The-AI-Engineer-Challenge/frontend
npm install
npm run dev
# open http://localhost:3000
```

### Configuration
- Backend URL: expects FastAPI on `http://localhost:8000`
- API Key: set in the settings panel (stored in component state only)

### Run locally
```bash
cd app-challenge/The-AI-Engineer-Challenge/frontend
npm run dev
```

### Deploy (Vercel)
```bash
npm run build
vercel
```
- Update the backend URL to your deployed API

### Troubleshooting
- Frontend won’t start: run `npm install`; ensure Node 18+
- Can’t connect to backend: check backend is running and CORS allows your origin
- API key issues: validate your key and model availability

### License
This project is part of the AI Engineer Challenge by AI Makerspace.