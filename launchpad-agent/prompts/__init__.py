from .immigration import IMMIGRATION_PROMPT
from .compliance import COMPLIANCE_PROMPT
from .banking import BANKING_PROMPT

PROMPTS = {
    "immigration": IMMIGRATION_PROMPT,
    "compliance": COMPLIANCE_PROMPT,
    "banking": BANKING_PROMPT,
}

__all__ = ["PROMPTS", "IMMIGRATION_PROMPT", "COMPLIANCE_PROMPT", "BANKING_PROMPT"]
