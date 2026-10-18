"""Server-sent events helpers shared by streaming endpoints."""

from collections.abc import AsyncIterator

from fastapi.responses import StreamingResponse
from pydantic import BaseModel


def sse_event(event: BaseModel, event_type: str) -> str:
    return f"event: {event_type}\ndata: {event.model_dump_json(exclude_none=True)}\n\n"


def sse_response(events: AsyncIterator[BaseModel], *, type_field: str = "type") -> StreamingResponse:
    """Streams each event as `event: <its type>` with the event as JSON data."""

    async def body() -> AsyncIterator[str]:
        async for event in events:
            yield sse_event(event, str(getattr(event, type_field)))

    return StreamingResponse(
        body(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
