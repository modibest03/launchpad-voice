# Launchpad Voice Agent

Production-ready voice intake agent for startup founders facing immigration, compliance, or banking challenges. Built on LiveKit Agents + Claude + Deepgram + ElevenLabs.

---

## Architecture

```
Founder (browser mic)
        │
        ▼
 LiveKit Room (WebRTC)
        │
        ├──► Deepgram Nova-3 (STT)  →  real-time transcription
        │
        ├──► Claude Sonnet (LLM)   →  structured intake interview
        │
        └──► ElevenLabs Turbo v2.5 (TTS) → voice response
                                │
                                ▼
                     <context_json> emitted
                                │
                                ▼
                    FastAPI Token Server
                     saves session + serves
                     to advisor dashboard
```

**Latency budget (target):**
- STT first word: ~200ms (Deepgram Nova-3 streaming)
- LLM first token: ~400ms (Claude Sonnet streaming)
- TTS first audio: ~150ms (ElevenLabs streaming)
- **Total round-trip: ~800ms–1.2s** ✓

---

## Project Structure

```
launchpad-agent/          # Python backend (LiveKit agent + token server)
│   agent.py              # Main agent entrypoint — run this as a LiveKit worker
│   server.py             # FastAPI token server
│   requirements.txt
│   .env.example
│   prompts/
│   │   immigration.py    # Immigration intake system prompt
│   │   compliance.py     # Compliance intake system prompt
│   │   banking.py        # Banking intake system prompt
│   utils/
│       context_extractor.py   # JSON extraction from agent output
│       session_store.py       # Session persistence (memory + disk)

launchpad-voice/          # React + Vite frontend
│   src/
│   │   App.jsx           # Root component
│   │   hooks/
│   │   │   useRealVoiceSession.js   # LiveKit room connection hook
│   │   │   useVoiceSession.js       # Mock session hook (dev/demo)
│   │   components/       # VoiceOrb, Waveform, Transcript, InfoFields,
│   │                       ContextReport, Sidebar, ConnectionStatus
│   │   data/
│   │       i18n.js        # 6-language strings
│   │       mockData.js    # Demo dialogue + context payloads
```

---

## Quick Start

### 1. Get your API keys

| Service | URL | Key needed |
|---------|-----|------------|
| LiveKit Cloud | https://cloud.livekit.io | URL + API key + secret |
| Anthropic | https://console.anthropic.com | API key |
| Deepgram | https://console.deepgram.com | API key |
| ElevenLabs | https://elevenlabs.io/app/api-keys | API key |

### 2. Backend setup

```bash
cd launchpad-agent

# Create virtualenv
python3 -m venv venv && source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Terminal 1 — Start the agent worker
python agent.py dev

# Terminal 2 — Start the token server
uvicorn server:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd launchpad-voice

npm install

# Configure environment
cp .env.example .env
# Set VITE_TOKEN_SERVER_URL=http://localhost:8000

npm run dev
```

Open http://localhost:5173 — select a category, pick a language, tap the mic.

---

## Multi-language Support

| Language | STT Model | TTS Voice | Code |
|----------|-----------|-----------|------|
| English | Deepgram Nova-3 en-US | Rachel | `en` |
| French | Deepgram Nova-3 fr | Charlotte | `fr` |
| Spanish | Deepgram Nova-3 es | Charlotte | `es` |
| Arabic | Deepgram Nova-3 ar | Charlotte (multilingual) | `ar` |
| Mandarin | Deepgram Nova-3 zh-CN | Charlotte (multilingual) | `zh` |
| Portuguese | Deepgram Nova-3 pt-BR | Charlotte | `pt` |

Language is auto-detected from the room metadata set by the frontend. Claude responds entirely in the detected language.

---

## Output: Context JSON

When the agent completes the intake, it emits a structured JSON via LiveKit data channel (topic: `launchpad.context`). Example for immigration:

```json
{
  "session_id": "3f8a2c1d-...",
  "timestamp": "2026-04-29T09:14:00Z",
  "category": "immigration",
  "language": "en",
  "urgency_score": 9,
  "founder": {
    "name": "Amara Diallo",
    "company": "Veza Health",
    "stage": "series_a",
    "nationality": "Guinean",
    "current_visa": "O-1A",
    "visa_status": "valid"
  },
  "issue": {
    "type": "renewal",
    "visa_category": "O-1A",
    "description": "O-1A visa expiring in 6 weeks. Attorney is unresponsive.",
    "hard_deadline": "2026-06-10",
    "days_to_deadline": 42
  },
  "advisor_recommendations": [
    "Engage a specialized O-1A attorney within 48 hours",
    "File premium processing (I-907) immediately",
    "Compile extraordinary ability evidence package",
    "Draft investor meeting contingency memo"
  ],
  "transcript_summary": "..."
}
```

---

## Production Deployment

### Option A: Railway (recommended for MVP)

```bash
# Backend
railway init
railway add
# Set env vars in Railway dashboard
railway up

# Frontend — Vercel
vercel --prod
```

### Option B: AWS

- Agent worker: EC2 t3.small (or Fargate for auto-scaling)
- Token server: Lambda + API Gateway
- Sessions: RDS Postgres (replace session_store.py)
- Frontend: CloudFront + S3

### Scaling the agent

LiveKit Agents scales horizontally — run multiple `python agent.py start` processes and the LiveKit dispatcher routes new rooms automatically. No sticky sessions required.

---

## Swapping to Production Session Store

Replace `utils/session_store.py` with a Postgres/Redis implementation:

```python
import asyncpg

async def save_session(session_id: str, context: dict):
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    await conn.execute(
        "INSERT INTO sessions(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data=$2",
        session_id, json.dumps(context)
    )
```

---

## Webhook: Push Context to CRM / Notion

Set `WEBHOOK_URL` in `.env` and uncomment the webhook call in `agent.py`. The completed context JSON will be POSTed to your endpoint when a session finishes.
