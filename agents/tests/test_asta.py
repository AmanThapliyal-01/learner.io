from datetime import date
from typing import Any

from fastapi.testclient import TestClient
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, SystemMessage
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_core.runnables import RunnableLambda
from pydantic import SecretStr

from learner_agents.asta.prompt import chat_messages, extraction_messages
from learner_agents.asta.schemas import AstaRequest, ChatTurn, GoalDraft, GoalSummary, ProfileContext
from learner_agents.asta.service import CARD_INTRO, AstaModels, asta_models, stream_reply
from learner_agents.core.auth import SERVICE_TOKEN_HEADER
from learner_agents.core.config import Settings
from learner_agents.core.llm import AllModelsExhaustedError
from learner_agents.main import create_app

COMPLETE: dict[str, Any] = {
    "goal_type": "professional",
    "title": "Become an AI engineer",
    "target_outcome": "Lead AI features at work",
    "motivation": "My company is starting AI features",
    "hours_per_week": 6,
    "timeline": "4 months",
    "timeline_discussed": True,
    "learning_style": "hands_on",
    "budget": "free_only",
    "skills": ["Python", "Prompt design", "RAG"],
    "current_experience": "3 years backend in C#",
}


class FakeChat(BaseChatModel):
    """Streams `replies[n]` on the n-th call (the last one repeats), or raises `error`."""

    replies: list[list[str]] = [["Hi"]]
    error: Exception | None = None
    calls: int = 0

    @property
    def _llm_type(self) -> str:
        return "fake-chat"

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content="".join(self.replies[0])))])

    async def _astream(self, messages, stop=None, run_manager=None, **kwargs):
        self.calls += 1
        if self.error:
            raise self.error
        for part in self.replies[min(self.calls, len(self.replies)) - 1]:
            yield ChatGenerationChunk(message=AIMessageChunk(content=part))


def extractor(draft: GoalDraft | Exception):
    async def run(_messages):
        if isinstance(draft, Exception):
            raise draft
        return draft

    return RunnableLambda(run)


def models(draft: GoalDraft | Exception = GoalDraft(), chat: FakeChat | None = None) -> AstaModels:
    return AstaModels(chat=chat or FakeChat(), extractor=extractor(draft))


def request(*user_messages: str) -> AstaRequest:
    return AstaRequest(messages=[ChatTurn(role="user", content=m) for m in user_messages])


async def collect(m: AstaModels, req: AstaRequest | None = None):
    return [event async for event in stream_reply(req or request("hi"), m)]


async def test_incomplete_goal_streams_asta_reply():
    events = await collect(models(chat=FakeChat(replies=[["What do ", "you want to learn?"]])))

    assert [e.type for e in events] == ["token", "token", "done"]
    assert "".join(e.text or "" for e in events) == "What do you want to learn?"


async def test_back_to_back_segments_get_a_space():
    events = await collect(models(chat=FakeChat(replies=[["Adjust any of these.", "Do they fit?"]])))

    assert "".join(e.text or "" for e in events) == "Adjust any of these. Do they fit?"


async def test_complete_goal_shows_card_without_calling_chat():
    chat = FakeChat()
    events = await collect(models(GoalDraft.model_validate(COMPLETE), chat))

    assert [e.type for e in events] == ["goal_summary", "done"]
    assert events[0].text == CARD_INTRO
    assert events[0].goal_summary is not None and events[0].goal_summary.hours_per_week == 6
    assert chat.calls == 0


async def test_question_from_user_is_answered_before_the_card():
    draft = GoalDraft.model_validate({**COMPLETE, "user_asked_question": True})
    events = await collect(models(draft, FakeChat(replies=[["MLOps means running models in production."]])))

    assert all(e.type != "goal_summary" for e in events)


async def test_empty_reply_is_retried_invisibly():
    chat = FakeChat(replies=[[""], ["Why now?"]])
    events = await collect(models(chat=chat))

    assert chat.calls == 2
    assert "".join(e.text or "" for e in events) == "Why now?"


async def test_failed_extraction_keeps_the_conversation_going():
    events = await collect(models(RuntimeError("bad json"), FakeChat(replies=[["Tell me more."]])))

    assert "".join(e.text or "" for e in events) == "Tell me more."


async def test_rate_limited_everywhere_reports_when_asta_is_back():
    events = await collect(models(AllModelsExhaustedError(retry_at=1_900_000_000.0, last_error=None)))

    assert len(events) == 1
    assert (events[0].type, events[0].code) == ("error", "rate_limited")
    assert events[0].retry_at is not None and events[0].retry_at.timestamp() == 1_900_000_000.0


async def test_chat_failure_becomes_friendly_error():
    events = await collect(models(chat=FakeChat(error=RuntimeError("boom"))))

    assert [(e.type, e.code) for e in events] == [("error", "agent_error")]


def test_draft_lists_what_is_missing_in_asking_order():
    draft = GoalDraft(goal_type="professional", target_outcome="Lead AI features", hours_per_week=6)

    assert draft.missing() == [
        "why they want it now",
        "a timeline or deadline (no deadline is fine)",
        "learning style: video, reading, hands-on or mixed",
        "budget: free resources only or paid is OK",
        "which skills to assess (propose up to 6)",
    ]
    assert draft.to_summary() is None


def test_summary_falls_back_to_outcome_as_title_and_caps_skills():
    draft = GoalDraft.model_validate({**COMPLETE, "title": None, "skills": [f"Skill {i}" for i in range(9)]})

    summary = draft.to_summary()

    assert summary is not None
    assert summary.title == "Lead AI features at work"
    assert len(summary.skills) == 6


def test_summary_uses_plain_hyphens_and_dedupes_skills():
    draft = GoalDraft.model_validate({**COMPLETE, "skills": ["Fine‑tuning", "Fine-tuning", "RAG"]})

    assert draft.to_summary().skills == ["Fine-tuning", "RAG"]


def test_chat_prompt_names_missing_items_and_search_only_when_available():
    req = AstaRequest(
        profile=ProfileContext(full_name="Asha", profession="Backend developer", skills=["C#", "SQL"]),
        messages=[ChatTurn(role="user", content="I want to get into AI")],
    )
    draft = GoalDraft(goal_type="professional", target_outcome="Get into AI")

    with_search = chat_messages(req, draft, web_search=True, today=date(2026, 10, 18))
    without = chat_messages(req, draft, web_search=False)

    system = with_search[0]
    assert isinstance(system, SystemMessage)
    assert "Still to find out, in this order: why they want it now; " in system.content
    assert "- Profession: Backend developer" in system.content
    assert "2026-10-18" in system.content
    assert "web search" in system.content and "web search" not in without[0].content
    assert isinstance(with_search[1], HumanMessage)


def test_extraction_sees_profile_and_transcript_including_shown_card():
    req = AstaRequest(
        profile=ProfileContext(profession="Backend developer"),
        messages=[
            ChatTurn(role="user", content="AI engineer"),
            ChatTurn(role="assistant", content=CARD_INTRO, goal_summary=GoalSummary.model_validate(COMPLETE)),
            ChatTurn(role="user", content="Make it 8 hours"),
        ],
    )

    system, transcript = extraction_messages(req)

    assert "- Profession: Backend developer" in system.content
    assert "User: AI engineer" in transcript.content
    assert '"hours_per_week": 6' in transcript.content
    assert transcript.content.endswith("User: Make it 8 hours")


def test_stream_endpoint_returns_server_sent_events():
    settings = Settings(groq_api_key=SecretStr("unused"), agent_service_token=SecretStr("t"), database_url="postgresql://unused", run_worker=False)
    app = create_app(settings)
    app.dependency_overrides[asta_models] = lambda: models(chat=FakeChat(replies=[["Hello"]]))

    with TestClient(app) as client:
        response = client.post(
            "/asta/stream",
            headers={SERVICE_TOKEN_HEADER: "t"},
            json={"messages": [{"role": "user", "content": "hi"}]},
        )

    assert response.headers["content-type"].startswith("text/event-stream")
    assert 'event: token\ndata: {"type":"token","text":"Hello"}' in response.text
    assert "event: done" in response.text
