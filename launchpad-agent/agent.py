"""
Launchpad Voice Agent  —  Multilingual build
---------------------------------------------
TTS priority:
  1. Cartesia Sonic-3  — native multilingual, free tier, low latency
  2. ElevenLabs        — if ELEVEN_API_KEY set (paid plan required for server)
  3. Deepgram Aura-2   — English-only fallback

Language support: EN, FR, ES, AR, ZH, PT
"""

import json
import logging
import os
import uuid

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RoomInputOptions,
    WorkerOptions,
    WorkerType,
    cli,
)
from livekit.plugins import anthropic, deepgram, silero

from prompts import get_prompt, LANGUAGE_NAMES
from utils import build_fallback_context, extract_context_json, save_session

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("launchpad.agent")

# ---------------------------------------------------------------------------
# Language config
# ---------------------------------------------------------------------------
DEEPGRAM_STT_LANG = {
    "en": "en-US", "fr": "fr", "es": "es",
    "ar": "ar",    "zh": "zh-CN", "pt": "pt-BR",
}

# Cartesia language codes
CARTESIA_LANG = {
    "en": "en",
    "fr": "fr",
    "es": "es",
    "ar": "ar",
    "zh": "zh",
    "pt": "pt",
}

# Cartesia multilingual voice — "Helpful Woman" works across all languages
CARTESIA_VOICE_ID = "f786b574-daa5-4673-aa0c-cbe3e8534c02"

SPEED_ADDENDUM = """

## RESPONSE STYLE FOR VOICE (CRITICAL)
- Keep every conversational response to 1-3 SHORT sentences maximum
- Never use bullet points, lists, or numbered items in spoken responses — this is voice
- Never say "Certainly!", "Of course!", "Great question!" — go straight to content
- After acknowledging an answer, ask the NEXT question immediately
- Use natural spoken contractions: "I'll", "you've", "what's", "let's"
- No preamble. No summaries mid-conversation. Just move forward.
- ALWAYS respond in the same language the founder is speaking

## JSON OUTPUT EXCEPTION
When outputting the final <context_json> block:
- The short-response rule does NOT apply — output the COMPLETE JSON
- Output the full JSON immediately after the termination phrase
- Do NOT truncate or summarize the JSON
- The JSON MUST be complete and valid — all fields filled with real data from the conversation
- Use actual values from the conversation, never placeholder text like "<string>" or "<uuid>"
"""


# ---------------------------------------------------------------------------
# Metadata extraction — 3-strategy approach
# ---------------------------------------------------------------------------
def extract_session_meta(ctx: JobContext) -> dict:
    category   = "immigration"
    language   = "en"
    session_id = str(uuid.uuid4())

    # Strategy 1: room name encodes category
    room_name = ctx.room.name or ""
    if room_name.startswith("launchpad-"):
        parts = room_name.split("-")
        if len(parts) >= 2:
            cat = parts[1]
            if cat in ("immigration", "compliance", "banking"):
                category = cat
                logger.info(f"Category from room name: {category}")
        if len(parts) >= 3:
            session_id = "-".join(parts[2:])

    # Strategy 2: participant metadata JSON
    try:
        participants = list(ctx.room.remote_participants.values())
        if participants:
            p = participants[0]
            if p.metadata:
                meta = json.loads(p.metadata)
                category   = meta.get("category", category)
                language   = meta.get("language", language)
                session_id = meta.get("session_id", session_id)
                logger.info(f"Category from participant metadata: {category}")
    except Exception as e:
        logger.warning(f"Could not parse participant metadata: {e}")

    # Strategy 3: participant attributes
    try:
        participants = list(ctx.room.remote_participants.values())
        if participants:
            attrs = participants[0].attributes or {}
            if "category" in attrs:
                category   = attrs.get("category", category)
                language   = attrs.get("language", language)
                session_id = attrs.get("session_id", session_id)
                logger.info(f"Category from participant attributes: {category}")
    except Exception as e:
        logger.warning(f"Could not read participant attributes: {e}")

    return {"category": category, "language": language, "session_id": session_id}


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------
class LaunchpadAgent(Agent):
    def __init__(self, category: str, session_id: str, room, language: str = 'en'):
        self.category   = category
        self.session_id = session_id
        self._room      = room
        self._transcript: list[dict] = []
        self._context_emitted = False

        self.language = language if hasattr(self, '_language_set') else language
        base_prompt = get_prompt(category, language)
        super().__init__(instructions=base_prompt + SPEED_ADDENDUM)

    async def on_enter(self) -> None:
        logger.info(f"Agent active — category={self.category}  lang={self.language}")
        lang_name = LANGUAGE_NAMES.get(self.language, "English")
        await self.session.generate_reply(
            instructions=(
                f"You MUST speak in {lang_name} only. "
                f"Greet the founder warmly in {lang_name}, "
                f"introduce yourself as their Launchpad advisor in {lang_name}, "
                f"then ask for their name and company in {lang_name}. "
                f"Two sentences maximum. Every word must be in {lang_name}."
            )
        )

    async def on_user_turn_completed(self, turn_ctx, new_message) -> None:
        # Use text_content property — the correct way to extract text from ChatMessage
        text = ""
        if hasattr(new_message, "text_content") and new_message.text_content:
            text = new_message.text_content.strip()
        elif hasattr(new_message, "content"):
            raw = new_message.content
            if isinstance(raw, str):
                text = raw.strip()
            elif isinstance(raw, list):
                parts = []
                for b in raw:
                    if isinstance(b, str):
                        parts.append(b)
                    elif hasattr(b, "text"):
                        parts.append(b.text)
                text = " ".join(parts).strip()
        if text:
            self._transcript.append({"role": "user", "text": text})
            logger.info(f"[user] {text[:120]}")


# ---------------------------------------------------------------------------
# TTS builder — Cartesia primary (multilingual), ElevenLabs optional, Deepgram fallback
# ---------------------------------------------------------------------------
def build_tts(language: str):
    cartesia_key = os.getenv("CARTESIA_API_KEY", "").strip()
    eleven_key   = os.getenv("ELEVEN_API_KEY", "").strip()

    # Option 1: Cartesia — native multilingual
    if cartesia_key and len(cartesia_key) > 10:
        try:
            from livekit.plugins import cartesia
            lang_code = CARTESIA_LANG.get(language, "en")
            logger.info(f"TTS: Cartesia Sonic-3 ({lang_code})")
            return cartesia.TTS(
                model="sonic-3",
                voice=CARTESIA_VOICE_ID,
                language=lang_code,
                api_key=cartesia_key,
            )
        except Exception as e:
            logger.warning(f"Cartesia init failed ({e}), trying ElevenLabs")

    # Option 2: ElevenLabs multilingual
    if eleven_key and len(eleven_key) > 20 and not eleven_key.startswith("sk_your"):
        try:
            from livekit.plugins import elevenlabs
            logger.info("TTS: ElevenLabs multilingual v2")
            return elevenlabs.TTS(
                model="eleven_multilingual_v2",
                voice_id="XB0fDUnXU5powFXDhCwa",  # Charlotte
                api_key=eleven_key,
            )
        except Exception as e:
            logger.warning(f"ElevenLabs init failed ({e}), using Deepgram")

    # Option 3: Deepgram Aura-2 — English only fallback
    logger.info("TTS: Deepgram Aura-2 (English only fallback)")
    return deepgram.TTS(model="aura-2-andromeda-en")


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
async def entrypoint(ctx: JobContext):
    await ctx.connect()

    import asyncio
    try:
        await asyncio.wait_for(ctx.wait_for_participant(), timeout=10.0)
    except asyncio.TimeoutError:
        logger.warning("No participant joined within 10s, using defaults")

    meta       = extract_session_meta(ctx)
    category   = meta["category"]
    language   = meta["language"]
    session_id = meta["session_id"]

    logger.info(f"Session — id={session_id}  category={category}  lang={language}")

    agent = LaunchpadAgent(category=category, session_id=session_id, room=ctx.room, language=language)

    session = AgentSession(
        stt=deepgram.STT(
            model="nova-3",
            language=DEEPGRAM_STT_LANG.get(language, "en-US"),
            smart_format=True,
            punctuate=True,
            interim_results=True,
            endpointing_ms=50,
            no_delay=True,
            filler_words=True,
        ),
        llm=anthropic.LLM(
            model="claude-sonnet-4-20250514",
            temperature=0.3,
            max_tokens=1200,  # must be high enough for full context JSON (~600 tokens)
            caching="ephemeral",
        ),
        tts=build_tts(language),
        vad=silero.VAD.load(
            min_speech_duration=0.05,
            min_silence_duration=0.2,
            prefix_padding_duration=0.1,
            activation_threshold=0.65,
        ),
        preemptive_generation=True,
        allow_interruptions=True,
        min_endpointing_delay=0.08,
        max_endpointing_delay=1.8,
        min_interruption_duration=0.4,
        min_interruption_words=2,
        turn_detection="vad",
    )

    @session.on("conversation_item_added")
    def on_item_added(event):
        item = event.item

        # Only process ChatMessage items (not AgentHandoff etc.)
        if not hasattr(item, "role"):
            return

        role = item.role

        # Extract text using the proper text_content property
        text = ""
        if hasattr(item, "text_content") and item.text_content:
            text = item.text_content.strip()
        elif hasattr(item, "content"):
            raw = item.content
            if isinstance(raw, str):
                text = raw.strip()
            elif isinstance(raw, list):
                parts = []
                for b in raw:
                    if isinstance(b, str):
                        parts.append(b)
                    elif hasattr(b, "text"):
                        parts.append(b.text)
                text = " ".join(parts).strip()

        if not text:
            return

        # User messages are already captured in on_user_turn_completed
        # Only capture assistant messages here to avoid duplicates
        if role == "assistant":
            # Deduplicate — don't add if last entry is identical
            if not agent._transcript or agent._transcript[-1].get("text") != text:
                agent._transcript.append({"role": "assistant", "text": text})
            logger.info(f"[assistant] {text[:120]}")

            # Accumulate text across messages for context JSON detection
            # The JSON may be in a separate message from the termination phrase
            agent._accumulated_text = getattr(agent, "_accumulated_text", "") + "\n" + text
            full_text = agent._accumulated_text

            # Check for context JSON in current message or accumulated buffer
            if not agent._context_emitted:
                if "<context_json>" in text and "</context_json>" in text:
                    # Complete JSON in one message — ideal case
                    import asyncio
                    asyncio.create_task(_emit_context(agent, text))
                elif "<context_json>" in full_text and "</context_json>" in full_text:
                    # JSON spans multiple messages — use accumulated buffer
                    import asyncio
                    asyncio.create_task(_emit_context(agent, full_text))

    @session.on("error")
    def on_error(event):
        logger.error(f"Session error: {event.error}")

    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(),
    )


# ---------------------------------------------------------------------------
# Context emission
# ---------------------------------------------------------------------------
async def _emit_context(agent: LaunchpadAgent, text: str):
    agent._context_emitted = True
    context = extract_context_json(text)

    if context is None:
        logger.warning("JSON extraction failed — using fallback")
        context = build_fallback_context(
            category=agent.category,
            language="en",
            transcript=agent._transcript,
        )

    context["session_id"] = agent.session_id
    context["transcript"] = agent._transcript
    save_session(agent.session_id, context)

    try:
        payload = json.dumps({
            "type":       "context_ready",
            "session_id": agent.session_id,
            "context":    context,
        }).encode()

        if agent._room:
            await agent._room.local_participant.publish_data(
                payload, reliable=True, topic="launchpad.context",
            )
            logger.info(f"Context emitted — session {agent.session_id}")
    except Exception as e:
        logger.error(f"Failed to emit context: {e}")


# ---------------------------------------------------------------------------
# Worker
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
        )
    )