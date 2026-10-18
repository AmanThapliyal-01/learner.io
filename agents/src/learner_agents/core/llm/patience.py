"""For background work: wait out short rate limits instead of failing."""

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from typing import TypeVar

from learner_agents.core.llm.fallback import AllModelsExhaustedError

logger = logging.getLogger(__name__)
T = TypeVar("T")


async def patiently(
    call: Callable[[], Awaitable[T]], *, max_wait_s: float = 90.0, max_waits: int = 4, sleep=asyncio.sleep
) -> T:
    """Runs `call`; when every model is briefly rate-limited (Groq's per-minute caps), waits and tries again.

    Gives up (re-raises) when the wait would be longer than `max_wait_s`, e.g. a daily limit.
    """
    for waits in range(max_waits + 1):
        try:
            return await call()
        except AllModelsExhaustedError as error:
            wait = (error.retry_at - time.time()) if error.retry_at else max_wait_s
            if waits == max_waits or wait > max_wait_s:
                raise
            logger.info("All models rate-limited; waiting %.0fs before retrying", max(wait, 1))
            await sleep(max(wait, 1) + 0.5)
    raise AssertionError("unreachable")
