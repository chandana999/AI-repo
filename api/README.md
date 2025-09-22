## OpenAI Chat API Backend

FastAPI service that streams chat completions from OpenAI. Plug your key in, send messages, watch tokens flow in real time. ⚡

### TL;DR
- What: Streaming chat backend built with FastAPI
- Why: Low-latency token streaming + simple integration for your frontend
- Run: `cd api && pip install -r requirements.txt && python app.py`

### Features
- ⚡ Streaming responses over `/api/chat`
- 🛡️ Input validation with Pydantic
- 🌐 CORS enabled for local dev
- 🧪 Built-in `/api/health`

### Quickstart
```bash
cd app-challenge/The-AI-Engineer-Challenge/api

# 1) Create and activate a virtualenv
python -m venv venv
# macOS/Linux
source venv/bin/activate
# Windows (PowerShell)
./venv/Scripts/Activate.ps1

# 2) Install deps
pip install -r requirements.txt

# 3) Run
python app.py
```

Once running: http://localhost:8000

### Configuration
- OpenAI API key: send it per-request in the JSON body as `api_key` (do not hardcode).
- Model: optional `model` string, default: `gpt-4.1-mini`.

Example request body:
```json
{
  "developer_message": "You are a helpful assistant.",
  "user_message": "Say hello in one sentence.",
  "model": "gpt-4.1-mini",
  "api_key": "YOUR_OPENAI_API_KEY"
}
```

### Endpoints
- POST `/api/chat` — streams response chunks as plain text
- GET `/api/health` — returns `{ "status": "ok" }`

Swagger: http://localhost:8000/docs  |  ReDoc: http://localhost:8000/redoc

### CORS
Configured as permissive (`*`) for local development in `app.py`. Tighten for production.

### Troubleshooting
- Import errors: Ensure the virtualenv is activated and deps are installed
- 401/invalid key: Verify `api_key` is valid and passed in the request body
- CORS issues: Adjust `allow_origins` in `app.py`

### License
This directory is part of the AI Engineer Challenge by AI Makerspace.