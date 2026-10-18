"""Groq models that the fallback chain can use, and what each one supports."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelSpec:
    id: str
    # Groq server-side tools such as {"type": "browser_search"}. Only gpt-oss models support them.
    builtin_tools: bool = False
    # Accepts reasoning_effort ("low" | "medium" | "high"). Lower effort = faster, fewer tokens.
    reasoning_effort: bool = False


# Order matters: the first model is preferred. Groq rate limits (RPD/TPD) are per model,
# so when one model is exhausted for the day the next one still has its own quota.
# The Llama models are Enterprise-tier on Groq; they're skipped automatically while the
# API key can't see them (see FallbackChatGroq.chain) and join the chain after an upgrade.
DEFAULT_MODEL_CHAIN: tuple[ModelSpec, ...] = (
    ModelSpec("openai/gpt-oss-120b", builtin_tools=True, reasoning_effort=True),
    ModelSpec("qwen/qwen3.8-27b"),
    ModelSpec("openai/gpt-oss-20b", builtin_tools=True, reasoning_effort=True),
    ModelSpec("llama-3.3-70b-versatile"),
    ModelSpec("llama-3.1-8b-instant"),
)

_KNOWN = {spec.id: spec for spec in DEFAULT_MODEL_CHAIN}


def resolve_chain(model_ids: list[str] | None) -> tuple[ModelSpec, ...]:
    """Turn configured model IDs into specs; unknown IDs are treated as function-tools only."""
    if not model_ids:
        return DEFAULT_MODEL_CHAIN
    return tuple(_KNOWN.get(model_id, ModelSpec(model_id)) for model_id in model_ids)


def rotated_chain(offset: int) -> list[str]:
    """The default chain starting `offset` models in, so parallel callers start on models with separate budgets."""
    ids = [spec.id for spec in DEFAULT_MODEL_CHAIN]
    k = offset % len(ids)
    return ids[k:] + ids[:k]
