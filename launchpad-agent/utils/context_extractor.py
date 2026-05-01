import re
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


def extract_context_json(text: str) -> Optional[dict]:
    """
    Extract and parse the <context_json> block from the agent's final message.
    Returns parsed dict or None if not found / invalid.
    """
    match = re.search(r"<context_json>(.*?)</context_json>", text, re.DOTALL)
    if not match:
        return None

    raw = match.group(1).strip()
    try:
        data = json.loads(raw)
        # Ensure required fields exist
        if "session_id" not in data or not data["session_id"]:
            data["session_id"] = str(uuid.uuid4())
        if "timestamp" not in data or not data["timestamp"]:
            data["timestamp"] = datetime.now(timezone.utc).isoformat()
        return data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse context JSON: {e}\nRaw: {raw[:200]}")
        return None


def build_fallback_context(category: str, language: str, transcript: list[dict]) -> dict:
    """
    Build a minimal context dict if JSON extraction fails.
    Used as a safety net to always produce something for the advisor.
    """
    return {
        "session_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "category": category,
        "language": language,
        "urgency_score": 5,
        "extraction_status": "fallback",
        "note": "Automatic extraction failed. Review transcript below.",
        "transcript": transcript,
    }


def compute_urgency_label(score: int) -> str:
    if score >= 9:
        return "CRITICAL"
    elif score >= 7:
        return "HIGH"
    elif score >= 4:
        return "MEDIUM"
    else:
        return "LOW"
