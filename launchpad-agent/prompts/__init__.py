from .immigration import IMMIGRATION_PROMPT
from .compliance import COMPLIANCE_PROMPT
from .banking import BANKING_PROMPT

_BASE_PROMPTS = {
    "immigration": IMMIGRATION_PROMPT,
    "compliance":  COMPLIANCE_PROMPT,
    "banking":     BANKING_PROMPT,
}

LANGUAGE_NAMES = {
    "en": "English",
    "fr": "French",
    "es": "Spanish",
    "ar": "Arabic",
    "zh": "Mandarin Chinese",
    "pt": "Portuguese (Brazilian)",
}

def get_prompt(category: str, language: str) -> str:
    """
    Returns the system prompt for the given category,
    with the language instruction injected at the very top
    so Claude speaks the right language from the first word.
    """
    base = _BASE_PROMPTS.get(category, _BASE_PROMPTS["immigration"])
    lang_name = LANGUAGE_NAMES.get(language, "English")

    language_block = f"""## ACTIVE LANGUAGE: {lang_name.upper()}
CRITICAL INSTRUCTION: You MUST speak and write EXCLUSIVELY in {lang_name} for this ENTIRE session.
- Your greeting must be in {lang_name}
- Every single response must be in {lang_name}
- Do NOT switch to English under any circumstances
- Even if the founder writes in English, respond in {lang_name}
- This overrides all other language instructions in this prompt

"""
    return language_block + base

# Keep backward compat
PROMPTS = _BASE_PROMPTS

__all__ = ["get_prompt", "PROMPTS", "LANGUAGE_NAMES"]