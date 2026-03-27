from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class UserContext:
    """Authenticated user info, stored on request.state.user by DualAuthMiddleware."""

    user_id: str | None = None
    email: str | None = None
    role: str = "editor"  # admin | editor | viewer
    org_id: str | None = None
    auth_source: Literal["jwt", "api_key", "legacy"] = "legacy"
