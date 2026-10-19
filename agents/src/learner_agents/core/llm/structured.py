"""Structured output on the fallback chain: a model that returns a validated Pydantic object."""

from typing import TypeVar

from langchain_core.language_models import LanguageModelInput
from langchain_core.runnables import Runnable
from pydantic import BaseModel

from learner_agents.core.llm.fallback import FallbackChatGroq

T = TypeVar("T", bound=BaseModel)


def structured_model(
    schema: type[T],
    *,
    model_ids: list[str] | None = None,
    temperature: float = 0.2,
    reasoning_effort: str | None = "low",
) -> Runnable[LanguageModelInput, T]:
    """Forces a tool call shaped like `schema`. Malformed calls fall through to the next model in the chain."""
    model = FallbackChatGroq(model_ids=model_ids, temperature=temperature, reasoning_effort=reasoning_effort)
    return model.with_structured_output(schema)  # type: ignore[return-value]
