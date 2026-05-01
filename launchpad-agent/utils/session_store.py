"""
Session store — in-memory for dev, swap with Redis/Postgres for production.
"""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# In-memory store: session_id -> context dict
_store: dict[str, dict] = {}

# Persist to local JSON file for dev/debugging
_PERSIST_DIR = Path(__file__).parent.parent / "sessions"
_PERSIST_DIR.mkdir(exist_ok=True)


def save_session(session_id: str, context: dict) -> None:
    _store[session_id] = context

    # Write to disk for inspection
    path = _PERSIST_DIR / f"{session_id}.json"
    try:
        with open(path, "w") as f:
            json.dump(context, f, indent=2)
        logger.info(f"Session saved: {path}")
    except OSError as e:
        logger.warning(f"Could not persist session to disk: {e}")


def get_session(session_id: str) -> Optional[dict]:
    if session_id in _store:
        return _store[session_id]

    # Try disk fallback
    path = _PERSIST_DIR / f"{session_id}.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return None


def list_sessions(category: Optional[str] = None) -> list[dict]:
    results = []
    for p in sorted(_PERSIST_DIR.glob("*.json"), reverse=True):
        with open(p) as f:
            s = json.load(f)
        if category is None or s.get("category") == category:
            results.append(s)
    return results


def session_summary(context: dict) -> str:
    name = context.get("founder", {}).get("name", "Unknown")
    company = context.get("founder", {}).get("company", "Unknown")
    cat = context.get("category", "unknown").title()
    urgency = context.get("urgency_score", "?")
    ts = context.get("timestamp", "")[:10]
    return f"[{ts}] {name} / {company} — {cat} (urgency {urgency}/10)"
