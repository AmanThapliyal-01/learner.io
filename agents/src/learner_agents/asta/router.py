from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from learner_agents.asta.schemas import AstaRequest
from learner_agents.asta.service import AstaModels, asta_models, stream_reply
from learner_agents.core.sse import sse_response

router = APIRouter(prefix="/asta", tags=["asta"])


@router.post("/stream")
async def stream(
    request: AstaRequest,
    models: Annotated[AstaModels, Depends(asta_models)],
) -> StreamingResponse:
    """One Asta reply as server-sent events: token*, goal_summary?, then done | error."""
    return sse_response(stream_reply(request, models))
