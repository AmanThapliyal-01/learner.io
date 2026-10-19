from typing import Any

import groq
import httpx
import pytest
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from pydantic import BaseModel, Field

from learner_agents.core.llm import AllModelsExhaustedError, FallbackChatGroq, cooldowns
from learner_agents.core.llm.cooldown import parse_duration
from learner_agents.core.llm.models import ModelSpec

CHAIN = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "qwen/qwen3.8-27b"]
BROWSER_SEARCH = {"type": "browser_search"}


def api_error(cls: type[groq.APIStatusError], status: int, headers=None, body=None):
    request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    response = httpx.Response(status, headers=headers or {}, request=request)
    return cls("error", response=response, body=body)


def daily_limit():
    return api_error(
        groq.RateLimitError,
        429,
        {"retry-after": "5", "x-ratelimit-remaining-requests": "0", "x-ratelimit-reset-requests": "2h30m"},
    )


class ScriptedModel(BaseChatModel):
    """Stand-in for ChatGroq: each call takes the next scripted outcome (the last one repeats)."""

    script: list[Any]
    fail_after_first_chunk: Exception | None = None
    calls: list[dict[str, Any]] = Field(default_factory=list)

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def _outcome(self, kwargs: dict[str, Any]) -> AIMessage:
        self.calls.append(kwargs)
        item = self.script[min(len(self.calls), len(self.script)) - 1]
        if isinstance(item, Exception):
            raise item
        return item if isinstance(item, AIMessage) else AIMessage(content=item)

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        return ChatResult(generations=[ChatGeneration(message=self._outcome(kwargs))])

    def _stream(self, messages, stop=None, run_manager=None, **kwargs):
        words = self._outcome(kwargs).content.split(" ")
        yield ChatGenerationChunk(message=AIMessageChunk(content=words[0]))
        if self.fail_after_first_chunk:
            raise self.fail_after_first_chunk
        for word in words[1:]:
            yield ChatGenerationChunk(message=AIMessageChunk(content=" " + word))


class ScriptedFallback(FallbackChatGroq):
    scripted: dict[str, ScriptedModel]

    accessible: frozenset[str] | None = None

    def _create_client(self, spec: ModelSpec) -> BaseChatModel:
        return self.scripted[spec.id]

    def _accessible_model_ids(self) -> frozenset[str] | None:
        return self.accessible


@pytest.fixture(autouse=True)
def fake_clock(monkeypatch):
    now = {"t": 1_000_000.0}
    monkeypatch.setattr(cooldowns, "_clock", lambda: now["t"])
    cooldowns.clear()
    yield now
    cooldowns.clear()


def build(**scripts: list[Any]) -> tuple[ScriptedFallback, dict[str, ScriptedModel]]:
    models = {model_id: ScriptedModel(script=scripts.get(f"m{i}", ["unused"])) for i, model_id in enumerate(CHAIN)}
    return ScriptedFallback(model_ids=CHAIN, scripted=models), models


def test_switches_to_next_model_on_daily_limit_and_remembers_it(fake_clock):
    llm, models = build(m0=[daily_limit()], m1=["from llama"])

    assert llm.invoke("hi").content == "from llama"
    assert llm.invoke("again").content == "from llama"
    assert len(models[CHAIN[0]].calls) == 1  # benched after the first 429, not retried

    fake_clock["t"] += 2.5 * 3600  # daily window (2h30m) has reset
    models[CHAIN[0]].script.append("back on gpt-oss")
    assert llm.invoke("later").content == "back on gpt-oss"


def test_all_models_exhausted_reports_earliest_reset(fake_clock):
    short = api_error(groq.RateLimitError, 429, {"retry-after": "30"})
    llm, _ = build(m0=[daily_limit()], m1=[short], m2=[daily_limit()])

    with pytest.raises(AllModelsExhaustedError) as caught:
        llm.invoke("hi")
    assert caught.value.retry_at == fake_clock["t"] + 30

    with pytest.raises(AllModelsExhaustedError):  # nothing is called while all are cooling down
        llm.invoke("hi again")


def test_non_failover_errors_are_raised_immediately():
    llm, models = build(m0=[api_error(groq.AuthenticationError, 401)], m1=["never"])

    with pytest.raises(groq.AuthenticationError):
        llm.invoke("hi")
    assert models[CHAIN[1]].calls == []


def test_request_too_large_falls_back_without_benching_the_model():
    llm, models = build(m0=[api_error(groq.APIStatusError, 413), "fits now"], m1=["smaller ok"])

    assert llm.invoke("huge").content == "smaller ok"
    assert llm.invoke("small").content == "fits now"
    assert len(models[CHAIN[0]].calls) == 2


async def test_async_invoke_falls_back():
    llm, _ = build(m0=[api_error(groq.InternalServerError, 503)], m1=["async ok"])

    assert (await llm.ainvoke("hi")).content == "async ok"


def test_stream_falls_back_before_first_token():
    llm, _ = build(m0=[daily_limit()], m1=["hello there friend"])

    assert "".join(chunk.content for chunk in llm.stream("hi")) == "hello there friend"


def test_stream_error_after_first_token_is_not_swallowed():
    llm, models = build(m0=["partial answer"], m1=["never"])
    models[CHAIN[0]].fail_after_first_chunk = api_error(groq.InternalServerError, 500)

    with pytest.raises(groq.InternalServerError):
        list(llm.stream("hi"))
    assert models[CHAIN[1]].calls == []


def test_builtin_tools_only_sent_to_models_that_support_them():
    llm, models = build(m0=[daily_limit()], m1=["ok"])

    def lookup(query: str) -> str:
        """Look something up."""
        return query

    llm.bind_tools([BROWSER_SEARCH, lookup]).invoke("hi")

    assert BROWSER_SEARCH in models[CHAIN[0]].calls[0]["tools"]  # gpt-oss supports it
    llama_tools = models[CHAIN[1]].calls[0]["tools"]
    assert [t["function"]["name"] for t in llama_tools] == ["lookup"]


def test_only_builtin_tools_are_dropped_entirely_with_tool_choice():
    llm, models = build(m0=[daily_limit()], m1=["ok"])

    llm.bind_tools([BROWSER_SEARCH], tool_choice="required").invoke("hi")

    assert "tools" not in models[CHAIN[1]].calls[0]
    assert "tool_choice" not in models[CHAIN[1]].calls[0]


def test_structured_output_survives_fallback():
    class Goal(BaseModel):
        title: str

    reply = AIMessage(content="", tool_calls=[{"name": "Goal", "args": {"title": "Learn LangGraph"}, "id": "1"}])
    llm, models = build(m0=[daily_limit()], m1=[reply])

    assert llm.with_structured_output(Goal).invoke("hi") == Goal(title="Learn LangGraph")
    sent = models[CHAIN[1]].calls[0]
    assert sent["tool_choice"] == "required"
    assert "ls_structured_output_format" not in sent


def test_models_the_key_cannot_access_are_skipped():
    llm, models = build(m0=[daily_limit()], m2=["qwen answered"])
    llm.accessible = frozenset({CHAIN[0], CHAIN[2]})  # e.g. Enterprise-only model missing

    assert llm.invoke("hi").content == "qwen answered"
    assert models[CHAIN[1]].calls == []


@pytest.mark.parametrize(
    ("value", "seconds"),
    [("2m59.56s", 179.56), ("7.66s", 7.66), ("1h2m", 3720.0), ("120ms", 0.12), ("5", 5.0), ("", None), ("soon", None)],
)
def test_parse_duration(value, seconds):
    expected = pytest.approx(seconds) if seconds is not None else None
    assert parse_duration(value) == expected
