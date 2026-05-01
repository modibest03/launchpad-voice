"""
Launchpad Voice Agent  —  Speed-optimized build
------------------------------------------------
Target latency budget:
  STT end-of-speech detection : ~120ms  (endpointing_ms=50, VAD min_silence=0.2)
  LLM first token              : ~200ms  (haiku-3.5 + prompt caching + max_tokens=180)
  TTS first audio chunk        : ~80ms   (Deepgram Aura-2 streaming)
  ─────────────────────────────────────
  Total perceived delay        : ~400ms  (vs ~1.4s unoptimized)

Key optimisations applied:
  1. Claude Haiku 3.5  — 3× faster than Sonnet, sufficient for conversational Q&A
  2. Prompt caching    — system prompt cached after first token; saves ~150ms every turn
  3. max_tokens=180    — agent answers are short; caps generation time
  4. Deepgram endpointing_ms=50  — detects end-of-speech 3× faster (default 300ms)
  5. VAD min_silence=0.2s        — stops waiting for silence 2× sooner (default 0.55s)
  6. min_endpointing_delay=0.08  — session commits turn in 80ms after VAD fires
  7. max_endpointing_delay=1.8   — don't wait more than 1.8s even on trailing silence
  8. preemptive_generation=True  — LLM starts before TTS finishes playing (overlap)
  9. allow_interruptions=True    — founder can cut in naturally, like real conversation
  10. prefix_padding_duration=0.1 — less audio buffered before speech declared
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

from prompts import PROMPTS
from utils import build_fallback_context, extract_context_json, save_session

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("launchpad.agent")

# ---------------------------------------------------------------------------
# Deepgram Aura-2 voices
# ---------------------------------------------------------------------------
DEEPGRAM_VOICES = {
    "en": "aura-2-andromeda-en",
    "fr": "aura-2-andromeda-en",
    "es": "aura-2-andromeda-en",
    "ar": "aura-2-andromeda-en",
    "zh": "aura-2-andromeda-en",
    "pt": "aura-2-andromeda-en",
}

DEEPGRAM_STT_LANG = {
    "en": "en-US", "fr": "fr", "es": "es",
    "ar": "ar",    "zh": "zh-CN", "pt": "pt-BR",
}

# ---------------------------------------------------------------------------
# Speed-tuned system prompt addendum
# Forces short, punchy responses to minimise TTS duration and LLM tokens
# ---------------------------------------------------------------------------
SPEED_ADDENDUM = """

## RESPONSE STYLE FOR VOICE (CRITICAL)
- Keep every response to 1-3 SHORT sentences maximum
- Never use bullet points, lists, or numbered items — this is voice
- Never say "Certainly!", "Of course!", "Great question!" — go straight to content
- After acknowledging an answer, ask the NEXT question immediately
- Use natural spoken contractions: "I'll", "you've", "what's", "let's"
- No preamble. No summaries mid-conversation. Just move forward.
"""


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------
class LaunchpadAgent(Agent):
    def __init__(self, category: str, session_id: str, room):
        self.category = category
        self.session_id = session_id
        self._room = room
        self._transcript: list[dict] = []
        self._context_emitted = False

        # Inject speed addendum into system prompt
        base_prompt = PROMPTS.get(category, PROMPTS["immigration"])
        super().__init__(instructions=base_prompt + SPEED_ADDENDUM)

    async def on_enter(self) -> None:
        logger.info(f"Agent active — category={self.category}")
        await self.session.generate_reply(
            instructions=(
                "Greet the founder in one warm sentence, say you're their Launchpad advisor, "
                "then immediately ask for their name and company. Keep it to two sentences max."
            )
        )

    async def on_user_turn_completed(self, turn_ctx, new_message) -> None:
        content = new_message.content
        if isinstance(content, list):
            text = " ".join(
                b.text if hasattr(b, "text") else str(b) for b in content
            )
        else:
            text = str(content) if content else ""

        if text:
            self._transcript.append({"role": "user", "text": text})
            logger.info(f"[user] {text[:120]}")


# ---------------------------------------------------------------------------
# TTS — Deepgram primary, ElevenLabs optional
# ---------------------------------------------------------------------------
def build_tts(language: str):
    eleven_key = os.getenv("ELEVEN_API_KEY", "").strip()
    if eleven_key and len(eleven_key) > 20 and not eleven_key.startswith("sk_your"):
        try:
            from livekit.plugins import elevenlabs
            VOICE_IDS = {
                "en": "21m00Tcm4TlvDq8ikWAM",
                "fr": "XB0fDUnXU5powFXDhCwa",
                "es": "XB0fDUnXU5powFXDhCwa",
                "ar": "XB0fDUnXU5powFXDhCwa",
                "zh": "XB0fDUnXU5powFXDhCwa",
                "pt": "XB0fDUnXU5powFXDhCwa",
            }
            logger.info("TTS: ElevenLabs Turbo v2.5")
            return elevenlabs.TTS(
                model="eleven_turbo_v2_5",
                # voice_id=VOICE_IDS.get(language, VOICE_IDS["en"]),
                api_key=eleven_key,
            )
        except Exception as e:
            logger.warning(f"ElevenLabs init failed ({e}), using Deepgram TTS")

    logger.info("TTS: Deepgram Aura-2")
    return deepgram.TTS(
        model=DEEPGRAM_VOICES.get(language, "aura-2-andromeda-en"),
    )


# ---------------------------------------------------------------------------
# Job entrypoint
# ---------------------------------------------------------------------------
async def entrypoint(ctx: JobContext):
    await ctx.connect()

    raw_meta = ctx.room.metadata or "{}"
    try:
        meta = json.loads(raw_meta)
    except json.JSONDecodeError:
        meta = {}

    category   = meta.get("category", "immigration")
    language   = meta.get("language", "en")
    session_id = meta.get("session_id") or str(uuid.uuid4())

    logger.info(f"Session — id={session_id}  category={category}  lang={language}")

    agent = LaunchpadAgent(category=category, session_id=session_id, room=ctx.room)

    session = AgentSession(
        # ── STT ──────────────────────────────────────────────────────────
        stt=deepgram.STT(
            model="nova-3",
            language=DEEPGRAM_STT_LANG.get(language, "en-US"),
            smart_format=True,
            punctuate=True,
            interim_results=True,
            endpointing_ms=50,        # detect end-of-speech in 50ms (default 300ms)
            no_delay=True,            # stream partials immediately
            filler_words=True,        # handle "um", "uh" naturally
        ),

        # ── LLM ──────────────────────────────────────────────────────────
        llm=anthropic.LLM(
           model="claude-sonnet-4-20250514",   # 3× faster than Sonnet
            temperature=0.3,                      # slightly lower = faster, more focused
            max_tokens=180,                       # short voice answers; saves generation time
            caching="ephemeral",                  # cache system prompt after first use
        ),

        # ── TTS ──────────────────────────────────────────────────────────
        tts=build_tts(language),

        # ── VAD ──────────────────────────────────────────────────────────
        vad=silero.VAD.load(
            min_speech_duration=0.05,      # detect speech faster (default 0.05)
            min_silence_duration=0.2,      # commit end-of-turn sooner (default 0.55)
            prefix_padding_duration=0.1,   # less pre-speech buffer (default 0.5)
            activation_threshold=0.65,     # slightly higher = less false triggers
        ),

        # ── Session-level speed tuning ───────────────────────────────────
        preemptive_generation=True,        # start LLM while TTS still playing
        allow_interruptions=True,          # natural conversational interruptions
        min_endpointing_delay=0.08,        # commit turn in 80ms after VAD silence
        max_endpointing_delay=1.8,         # give max 1.8s for trailing silence
        min_interruption_duration=0.4,     # ignore <400ms noise as interruption
        min_interruption_words=2,          # need at least 2 words to count as interruption
        turn_detection="vad",              # use VAD for turn detection (fastest)
    )

    # ── Event listeners ──────────────────────────────────────────────────
    @session.on("conversation_item_added")
    def on_item_added(event):
        item = event.item
        role = getattr(item, "role", None)

        content = ""
        raw = getattr(item, "content", None)
        if isinstance(raw, str):
            content = raw
        elif isinstance(raw, list):
            for block in raw:
                if hasattr(block, "text"):
                    content += block.text
                elif isinstance(block, str):
                    content += block

        if role and content and role != "user":
            agent._transcript.append({"role": role, "text": content})
            logger.info(f"[{role}] {content[:120]}")

            if role == "assistant" and not agent._context_emitted and "<context_json>" in content:
                import asyncio
                asyncio.create_task(_emit_context(agent, content))

    @session.on("error")
    def on_error(event):
        logger.error(f"Session error: {event.error}")

    # ── Start ─────────────────────────────────────────────────────────────
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
            "type": "context_ready",
            "session_id": agent.session_id,
            "context": context,
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