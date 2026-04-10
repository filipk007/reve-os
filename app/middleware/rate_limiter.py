"""Rate limit middleware backed by the `limits` library (ships with slowapi).

We use `limits` directly rather than slowapi's route decorators because our
limits are applied per-path-prefix at the middleware layer, not per-route.
`limits.strategies.MovingWindowRateLimiter` replaces the hand-rolled sliding
window and is the same engine slowapi uses internally.
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from limits import RateLimitItemPerMinute
from limits.storage import MemoryStorage
from limits.strategies import MovingWindowRateLimiter
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP per-bucket rate limiter using a moving window strategy."""

    # path prefix → config setting name
    PATH_LIMITS = {
        "/webhook": "rate_limit_webhook",
        "/batch": "rate_limit_batch",
        "/pipeline": "rate_limit_pipeline",
        "/channels": "rate_limit_chat",
    }

    def __init__(self, app):
        super().__init__(app)
        self._storage = MemoryStorage()
        self._limiter = MovingWindowRateLimiter(self._storage)

    def _get_bucket_and_limit(self, path: str) -> tuple[str, int]:
        for prefix, attr in self.PATH_LIMITS.items():
            if path.startswith(prefix):
                return prefix, getattr(settings, attr)
        return "_default", settings.rate_limit_default

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        bucket, limit = self._get_bucket_and_limit(request.url.path)

        rate = RateLimitItemPerMinute(limit)
        if not self._limiter.hit(rate, client_ip, bucket):
            return JSONResponse(
                status_code=429,
                content={
                    "error": True,
                    "error_message": f"Rate limit exceeded ({limit}/min)",
                    "skill": "unknown",
                },
                headers={"Retry-After": "60"},
            )

        return await call_next(request)
