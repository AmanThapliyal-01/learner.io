"""Only the C# API may call this service: every request except /health needs the shared token."""

import secrets

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

SERVICE_TOKEN_HEADER = "X-Service-Token"
PUBLIC_PATHS = frozenset({"/health"})


class ServiceTokenMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, token: str) -> None:
        super().__init__(app)
        self._token = token

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)
        supplied = request.headers.get(SERVICE_TOKEN_HEADER, "")
        if not secrets.compare_digest(supplied, self._token):
            return JSONResponse({"detail": "Invalid service token"}, status_code=401)
        return await call_next(request)
