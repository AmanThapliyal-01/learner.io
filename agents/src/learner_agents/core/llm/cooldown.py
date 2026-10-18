"""Tracks which models are rate-limited, and until when.

The registry is process-wide, so every LLM instance in the process learns from a 429
seen by any other instance and stops sending requests to an exhausted model.
"""

import re
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass

import groq

# Fallback durations when Groq gives no reset hint.
DEFAULT_RATE_LIMIT_COOLDOWN_S = 60.0
SERVER_ERROR_COOLDOWN_S = 30.0

_DURATION_PART = re.compile(r"(\d+(?:\.\d+)?)(ms|h|m|s)")
_UNIT_SECONDS = {"h": 3600.0, "m": 60.0, "s": 1.0, "ms": 0.001}


def parse_duration(value: str | None) -> float | None:
    """Parse Groq reset durations like '2m59.56s', '7.66s' or '1h2m' into seconds."""
    if not value:
        return None
    try:
        return float(value)  # plain seconds, as in retry-after
    except ValueError:
        pass
    parts = _DURATION_PART.findall(value)
    if not parts:
        return None
    return sum(float(amount) * _UNIT_SECONDS[unit] for amount, unit in parts)


def rate_limit_cooldown(error: groq.RateLimitError) -> float:
    """How long a model should rest after a 429, from Groq's rate-limit headers."""
    headers = error.response.headers
    candidates = [parse_duration(headers.get("retry-after"))]
    # Requests-per-day exhausted: the request reset header tells us when the day rolls over.
    if headers.get("x-ratelimit-remaining-requests") == "0":
        candidates.append(parse_duration(headers.get("x-ratelimit-reset-requests")))
    if headers.get("x-ratelimit-remaining-tokens") == "0":
        candidates.append(parse_duration(headers.get("x-ratelimit-reset-tokens")))
    known = [c for c in candidates if c is not None]
    return max(known) if known else DEFAULT_RATE_LIMIT_COOLDOWN_S


@dataclass(frozen=True)
class Cooldown:
    until: float  # wall-clock epoch seconds
    reason: str


class CooldownRegistry:
    def __init__(self, clock: Callable[[], float] = time.time) -> None:
        self._clock = clock
        self._lock = threading.Lock()
        self._cooldowns: dict[str, Cooldown] = {}

    def mark(self, model_id: str, seconds: float, reason: str) -> None:
        until = self._clock() + seconds
        with self._lock:
            current = self._cooldowns.get(model_id)
            if current is None or until > current.until:
                self._cooldowns[model_id] = Cooldown(until, reason)

    def is_available(self, model_id: str) -> bool:
        with self._lock:
            cooldown = self._cooldowns.get(model_id)
            if cooldown is None:
                return True
            if cooldown.until <= self._clock():
                del self._cooldowns[model_id]
                return True
            return False

    def earliest_available_at(self, model_ids: list[str]) -> float | None:
        """Epoch seconds when the first of these models comes back, or None if one is free now."""
        now = self._clock()
        with self._lock:
            untils = [c.until if (c := self._cooldowns.get(m)) else now for m in model_ids]
        earliest = min(untils, default=now)
        return None if earliest <= now else earliest

    def clear(self) -> None:
        with self._lock:
            self._cooldowns.clear()


cooldowns = CooldownRegistry()
