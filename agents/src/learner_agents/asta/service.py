"""One Asta turn: work out what's known, then either show the goal card or ask for what's missing.

The decision to show the card is made here in code from a structured extraction, never by the chat model,
so Asta can't finalize early, invent answers, or claim to have summarised without doing so.
"""

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from typing import Literal

from langchain_core.language_models import LanguageModelInput
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.runnables import Runnable
from pydantic import BaseModel

from learner_agents.asta.prompt import chat_messages, extraction_messages
from learner_agents.asta.schemas import AstaRequest, ChecklistItem, GoalDraft, GoalSummary
from learner_agents.core.llm import AllModelsExhaustedError, FallbackChatGroq

logger = logging.getLogger(__name__)

WEB_SEARCH_TOOL = {"type": "browser_search"}
CARD_INTRO = "Here's your goal. Check it over, then confirm or tell me what to change."
LOST_THREAD_REPLY = "Sorry, I lost my train of thought. Could you say that again?"
EMPTY_REPLY_ATTEMPTS = 2


class AstaEvent(BaseModel):
    type: Literal["progress", "token", "goal_summary", "done", "error"]
    # progress: what the goal card still needs, sent first. token: a piece of the reply.
    # goal_summary: the turn's whole text, shown above the card.
    text: str | None = None
    progress: list[ChecklistItem] | None = None
    goal_summary: GoalSummary | None = None
    model: str | None = None
    code: Literal["rate_limited", "agent_error"] | None = None
    retry_at: datetime | None = None


@dataclass(frozen=True)
class AstaModels:
    chat: Runnable[LanguageModelInput, AIMessage]
    extractor: Runnable[LanguageModelInput, GoalDraft]


@lru_cache
def asta_models() -> AstaModels:
    chat = FallbackChatGroq(temperature=0.4, reasoning_effort="low").bind_tools([WEB_SEARCH_TOOL])
    # Extraction prefers the small model: it's fast, and its rate limits are separate from the chat model's.
    extractor = FallbackChatGroq(
        model_ids=["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"],
        temperature=0,
        reasoning_effort="low",
    ).with_structured_output(GoalDraft)
    return AstaModels(chat=chat, extractor=extractor)  # type: ignore[arg-type]


def _join_segment(reply: str, text: str) -> str:
    """gpt-oss sometimes emits two final segments back to back ("...these.Do these..."): restore the space."""
    if reply and reply[-1] in ".!?" and text[:1].isupper():
        return " " + text
    return text


async def extract_draft(request: AstaRequest, extractor: Runnable[LanguageModelInput, GoalDraft]) -> GoalDraft | None:
    """What the conversation has established, or None if extraction failed (Asta then simply keeps asking)."""
    try:
        draft = await extractor.ainvoke(extraction_messages(request))
        return draft if isinstance(draft, GoalDraft) else GoalDraft.model_validate(draft)
    except AllModelsExhaustedError:
        raise
    except Exception:
        logger.exception("Goal extraction failed; continuing the conversation without it")
        return None


async def stream_reply(request: AstaRequest, models: AstaModels, *, web_search: bool = True) -> AsyncIterator[AstaEvent]:
    full: AIMessageChunk | None = None
    reply = ""
    try:
        extracted = await extract_draft(request, models.extractor)
        draft = extracted or GoalDraft()
        # Skipped when extraction failed, so a hiccup never wipes the checklist the user already sees.
        if extracted is not None:
            yield AstaEvent(type="progress", progress=draft.checklist())
        summary = draft.to_summary()
        if summary is not None and not draft.user_asked_question:
            yield AstaEvent(type="goal_summary", goal_summary=summary, text=CARD_INTRO)
            yield AstaEvent(type="done")
            return

        messages = chat_messages(request, draft, web_search=web_search)
        for attempt in range(1, EMPTY_REPLY_ATTEMPTS + 1):
            full, reply = None, ""
            async for chunk in models.chat.astream(messages):
                if not isinstance(chunk, AIMessageChunk):
                    continue
                full = chunk if full is None else full + chunk
                if isinstance(chunk.content, str) and chunk.content:
                    text = _join_segment(reply, chunk.content)
                    reply += text
                    yield AstaEvent(type="token", text=text)
            # gpt-oss occasionally spends a whole turn reasoning and says nothing. Nothing reached the user,
            # so asking again is invisible to them.
            if reply:
                break
            logger.warning("Asta returned an empty reply (attempt %s)", attempt)
    except AllModelsExhaustedError as error:
        retry_at = datetime.fromtimestamp(error.retry_at, UTC) if error.retry_at else None
        yield AstaEvent(type="error", code="rate_limited", retry_at=retry_at, text="Asta is taking a short break.")
        return
    except Exception:
        logger.exception("Asta reply failed")
        yield AstaEvent(type="error", code="agent_error", text="Asta couldn't reply just now. Please try again.")
        return

    if summary is not None:
        # Everything is known but the user asked something: answer it, then show the card in the same turn, so a
        # message read as a question ("I don't see the card") can't hold the card back.
        text = f"{reply.strip()}\n\n{CARD_INTRO}" if reply else CARD_INTRO
        yield AstaEvent(type="goal_summary", goal_summary=summary, text=text)
    elif not reply:
        yield AstaEvent(type="token", text=LOST_THREAD_REPLY)
    yield AstaEvent(type="done", model=(full.response_metadata.get("model_name") if full is not None else None))
