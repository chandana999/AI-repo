## ClearVitals Frontend

AI-powered medical lab report analysis with Next.js frontend. Upload your lab results for instant, personalized health insights. 🏥✨

### TL;DR
- What: Medical lab report analysis with AI
- Why: Understand your health data with AI insights
- Run: `cd frontend && npm install && npm run dev`

### Features
- 🏥 Medical lab report analysis with AI
- 📊 Instant health insights and recommendations
- 🔐 Secure API key input for OpenAI integration
- 📱 Responsive design for mobile and desktop
- ⚡ Real-time streaming AI responses

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
- Medical Focus: Optimized for lab report analysis and health insights

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