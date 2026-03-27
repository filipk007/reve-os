from fastapi import HTTPException, Request

from app.models.auth import UserContext


def require_role(*allowed_roles: str):
    """FastAPI dependency that checks request.state.user for required role.

    Usage:
        @router.delete("/resource/{id}", dependencies=[Depends(require_role("admin"))])
        async def delete_resource(...): ...
    """

    async def guard(request: Request) -> UserContext:
        user: UserContext | None = getattr(request.state, "user", None)
        if user is None:
            raise HTTPException(status_code=401, detail="Not authenticated")
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Requires role: {', '.join(allowed_roles)}",
            )
        return user

    return guard
