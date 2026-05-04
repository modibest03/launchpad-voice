"""
Token server — issues LiveKit access tokens for the frontend.
"""

import json
import os
import uuid
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from livekit.api import AccessToken, VideoGrants
from pydantic import BaseModel

from utils import get_session, list_sessions

load_dotenv()

LIVEKIT_URL      = os.getenv("LIVEKIT_URL", "wss://your-project.livekit.cloud")
LIVEKIT_API_KEY  = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")

app = FastAPI(title="Launchpad Voice Token Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TokenRequest(BaseModel):
    category: str = "immigration"
    language: str = "en"
    identity: Optional[str] = None


@app.post("/token")
async def create_token(req: TokenRequest):
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise HTTPException(status_code=500, detail="LiveKit credentials not configured")

    session_id = str(uuid.uuid4())
    identity   = req.identity or f"founder-{session_id[:8]}"

    # Room name encodes category + session for easy debugging
    room_name  = f"launchpad-{req.category}-{session_id}"

    session_meta = json.dumps({
        "category":   req.category,
        "language":   req.language,
        "session_id": session_id,
    })

    token = (
        AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(identity)
        # Participant metadata — read by agent from remote participant
        .with_metadata(session_meta)
        # Also set as participant attributes for extra reliability
        .with_attributes({
            "category":   req.category,
            "language":   req.language,
            "session_id": session_id,
        })
        .with_grants(
            VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
        )
        .to_jwt()
    )

    return {
        "token":      token,
        "session_id": session_id,
        "room_name":  room_name,
        "ws_url":     LIVEKIT_URL,
        "identity":   identity,
        # Echo back so frontend can confirm what was sent
        "category":   req.category,
        "language":   req.language,
    }


@app.get("/sessions")
async def get_sessions(category: Optional[str] = None):
    sessions = list_sessions(category=category)
    return {"sessions": sessions, "count": len(sessions)}


@app.get("/sessions/{session_id}")
async def get_session_by_id(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.get("/health")
async def health():
    return {"status": "ok", "service": "launchpad-token-server"}