"""A chat model that walks a chain of Groq models, switching when one hits its rate limit.

Use it anywhere a LangChain chat model is expected (LangGraph nodes, bind_tools,
with_structured_output). Each call goes to the first model in the chain that isn't
cooling down; a 429, server error or model-specific rejection moves on to the next one.
"""

import logging
from collections.abc import AsyncIterator, Iterator, Sequence
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

import groq
from langchain_core.callbacks import AsyncCallbackManagerForLLMRun, CallbackManagerForLLMRun
from langchain_core.language_models import BaseChatModel, LanguageModelInput
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGenerationChunk, ChatResult
from langchain_core.runnables import Runnable
from langchain_core.utils.function_calling import convert_to_openai_tool
from langchain_groq import ChatGroq
from pydantic import PrivateAttr, SecretStr

from learner_agents.core.config import get_settings
from learner_agents.core.llm.cooldown import SERVER_ERROR_COOLDOWN_S, cooldowns, rate_limit_cooldown
from learner_agents.core.llm.models import ModelSpec, resolve_chain

logger = logging.getLogger(__name__)

MODEL_UNAVAILABLE_COOLDOWN_S = 3600.0
# 400 error codes that are specific to one model, so another model may succeed.
_MODEL_SPECIFIC_BAD_REQUESTS = {"tool_use_failed", "json_validate_failed", "model_decommissioned"}


class AllModelsExhaustedError(RuntimeError):
    """Every model in the chain is rate-limited or failed for this request."""

    def __init__(self, retry_at: float | None, last_error: BaseException | None) -> None:
        self.retry_at = retry_at
        when = (
            f"; next model frees up at {datetime.fromtimestamp(retry_at, UTC):%H:%M:%S} UTC"
            if retry_at
            else ""
        )
        super().__init__(f"All Groq models are unavailable{when}")
        self.__cause__ = last_error


@lru_cache
def _models_visible_to_key(api_key: str) -> frozenset[str] | None:
    """Model IDs this key can call (asked once per process); None if Groq can't be asked."""
    try:
        return frozenset(model.id for model in groq.Groq(api_key=api_key, max_retries=1).models.list().data)
    except groq.GroqError:
        logger.warning("Couldn't list Groq models; using the configured chain unfiltered")
        return None


def _error_code(error: groq.APIStatusError) -> str | None:
    body = error.body if isinstance(error.body, dict) else {}
    inner = body.get("error", body)
    return inner.get("code") if isinstance(inner, dict) else None


def _failover_cooldown(error: groq.GroqError) -> tuple[bool, float | None]:
    """(should try the next model, seconds to bench this model or None)."""
    if isinstance(error, groq.RateLimitError):
        return True, rate_limit_cooldown(error)
    if isinstance(error, (groq.InternalServerError, groq.APIConnectionError)):
        return True, SERVER_ERROR_COOLDOWN_S
    if isinstance(error, groq.NotFoundError):
        return True, MODEL_UNAVAILABLE_COOLDOWN_S
    if isinstance(error, groq.APIStatusError) and error.status_code == 413:
        return True, None  # request bigger than this model's token limit; others may fit it
    if isinstance(error, groq.BadRequestError) and _error_code(error) in _MODEL_SPECIFIC_BAD_REQUESTS:
        return True, None
    return False, None


class FallbackChatGroq(BaseChatModel):
    model_ids: list[str] | None = None
    """Fallback order. None = GROQ_MODEL_CHAIN from settings, else the built-in default chain."""
    api_key: SecretStr | None = None
    temperature: float = 0.3
    max_tokens: int | None = None
    request_timeout: float | None = None
    reasoning_effort: str | None = None
    """Sent only to models that support it (gpt-oss); "low" keeps chat fast and cheap."""

    _clients: dict[str, BaseChatModel] = PrivateAttr(default_factory=dict)

    @property
    def _llm_type(self) -> str:
        return "groq-fallback"

    @property
    def _identifying_params(self) -> dict[str, Any]:
        return {"model_chain": [spec.id for spec in self.chain]}

    @property
    def chain(self) -> tuple[ModelSpec, ...]:
        configured = resolve_chain(self.model_ids or get_settings().model_chain)
        accessible = self._accessible_model_ids()
        if accessible is None:
            return configured
        usable = tuple(spec for spec in configured if spec.id in accessible)
        return usable or configured

    def _accessible_model_ids(self) -> frozenset[str] | None:
        return _models_visible_to_key((self.api_key or get_settings().groq_api_key).get_secret_value())

    def _create_client(self, spec: ModelSpec) -> BaseChatModel:
        settings = get_settings()
        return ChatGroq(
            model=spec.id,
            api_key=self.api_key or settings.groq_api_key,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            reasoning_effort=self.reasoning_effort if spec.reasoning_effort else None,
            timeout=self.request_timeout or settings.groq_request_timeout_s,
            max_retries=0,  # fail over immediately instead of retrying a rate-limited model
        )

    def _client(self, spec: ModelSpec) -> BaseChatModel:
        if spec.id not in self._clients:
            self._clients[spec.id] = self._create_client(spec)
        return self._clients[spec.id]

    def _available(self) -> list[ModelSpec]:
        available = [spec for spec in self.chain if cooldowns.is_available(spec.id)]
        if not available:
            raise self._exhausted(None)
        return available

    def _exhausted(self, last_error: BaseException | None) -> AllModelsExhaustedError:
        return AllModelsExhaustedError(
            cooldowns.earliest_available_at([spec.id for spec in self.chain]), last_error
        )

    def _record_failure(self, spec: ModelSpec, error: groq.GroqError) -> None:
        should_failover, cooldown_s = _failover_cooldown(error)
        if not should_failover:
            raise error
        if cooldown_s is not None:
            cooldowns.mark(spec.id, cooldown_s, type(error).__name__)
        logger.warning(
            "Groq model %s failed (%s); cooling down %s, trying next model",
            spec.id,
            type(error).__name__,
            f"{cooldown_s:.0f}s" if cooldown_s is not None else "not needed",
        )

    @staticmethod
    def _kwargs_for(spec: ModelSpec, kwargs: dict[str, Any]) -> dict[str, Any]:
        """Drop Groq built-in tools (e.g. browser_search) for models that don't support them."""
        if spec.builtin_tools or "tools" not in kwargs:
            return kwargs
        tools = [t for t in kwargs["tools"] if t.get("type") == "function"]
        trimmed = {**kwargs, "tools": tools}
        if not tools:
            trimmed.pop("tools")
            trimmed.pop("tool_choice", None)
        return trimmed

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        last_error: groq.GroqError | None = None
        for spec in self._available():
            try:
                return self._client(spec)._generate(
                    messages, stop, run_manager, **self._kwargs_for(spec, kwargs)
                )
            except groq.GroqError as error:
                self._record_failure(spec, error)
                last_error = error
        raise self._exhausted(last_error)

    async def _agenerate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: AsyncCallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        last_error: groq.GroqError | None = None
        for spec in self._available():
            try:
                return await self._client(spec)._agenerate(
                    messages, stop, run_manager, **self._kwargs_for(spec, kwargs)
                )
            except groq.GroqError as error:
                self._record_failure(spec, error)
                last_error = error
        raise self._exhausted(last_error)

    def _stream(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> Iterator[ChatGenerationChunk]:
        last_error: groq.GroqError | None = None
        for spec in self._available():
            started = False
            try:
                for chunk in self._client(spec)._stream(
                    messages, stop, run_manager, **self._kwargs_for(spec, kwargs)
                ):
                    started = True
                    yield chunk
                return
            except groq.GroqError as error:
                if started:  # the user already saw part of this answer; can't switch mid-reply
                    raise
                self._record_failure(spec, error)
                last_error = error
        raise self._exhausted(last_error)

    async def _astream(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: AsyncCallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[ChatGenerationChunk]:
        last_error: groq.GroqError | None = None
        for spec in self._available():
            started = False
            try:
                async for chunk in self._client(spec)._astream(
                    messages, stop, run_manager, **self._kwargs_for(spec, kwargs)
                ):
                    started = True
                    yield chunk
                return
            except groq.GroqError as error:
                if started:
                    raise
                self._record_failure(spec, error)
                last_error = error
        raise self._exhausted(last_error)

    def bind_tools(
        self,
        tools: Sequence[dict[str, Any] | type | Any],
        *,
        tool_choice: dict | str | bool | None = None,
        **kwargs: Any,
    ) -> Runnable[LanguageModelInput, AIMessage]:
        formatted = [
            tool
            if isinstance(tool, dict) and tool.get("type") not in (None, "function")
            else convert_to_openai_tool(tool)
            for tool in tools
        ]
        if tool_choice is True or tool_choice == "any":
            kwargs["tool_choice"] = "required"
        elif isinstance(tool_choice, str) and tool_choice not in ("auto", "none", "required"):
            kwargs["tool_choice"] = {"type": "function", "function": {"name": tool_choice}}
        elif tool_choice:
            kwargs["tool_choice"] = tool_choice
        return super().bind(tools=formatted, **kwargs)
