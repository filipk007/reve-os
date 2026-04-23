"""Auth router — signup, login, profile, API key management.

Uses Supabase Auth (GoTrue) for identity and the api_keys table for
programmatic access. All endpoints return JSON.
"""

import hashlib
import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.middleware.role_guard import require_role
from app.models.auth import UserContext

logger = logging.getLogger("clay-webhook-os")

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class SignupRequest(BaseModel):
    email: str = Field(..., description="User email")
    password: str = Field(..., description="Password (min 6 chars)")
    full_name: str | None = Field(None, description="Display name")


class LoginRequest(BaseModel):
    email: str
    password: str


class CreateKeyRequest(BaseModel):
    name: str = Field(..., description="Human label for the key")
    role: str = Field("editor", description="Role: admin | editor | viewer")
    scopes: list[str] = Field(default_factory=list, description="Optional scopes")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_anon_client():
    """Supabase client with anon key — for auth operations."""
    from supabase import create_client

    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="Supabase auth not configured")
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def _get_service_client():
    """Supabase client with service role key — bypasses RLS."""
    from app.core.supabase_client import get_client

    client = get_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    return client


def _get_user(request: Request) -> UserContext:
    user: UserContext | None = getattr(request.state, "user", None)
    if user is None or user.auth_source == "legacy":
        raise HTTPException(status_code=401, detail="JWT authentication required")
    return user


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@router.post("/signup")
async def signup(body: SignupRequest):
    """Create a new user via Supabase Auth."""
    client = _get_anon_client()
    try:
        result = client.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {"full_name": body.full_name or ""},
            },
        })
        if result.user is None:
            return JSONResponse(status_code=400, content={"error": True, "error_message": "Signup failed"})

        return {
            "user_id": str(result.user.id),
            "email": result.user.email,
            "message": "Account created. Check email for confirmation.",
        }
    except Exception as e:
        logger.error("[auth] Signup error: %s", e)
        return JSONResponse(status_code=400, content={"error": True, "error_message": str(e)})


@router.post("/login")
async def login(body: LoginRequest):
    """Sign in and return access + refresh tokens."""
    client = _get_anon_client()
    try:
        result = client.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
        if result.session is None:
            return JSONResponse(status_code=401, content={"error": True, "error_message": "Invalid credentials"})

        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "expires_in": result.session.expires_in,
            "user": {
                "id": str(result.user.id),
                "email": result.user.email,
            },
        }
    except Exception as e:
        logger.error("[auth] Login error: %s", e)
        return JSONResponse(status_code=401, content={"error": True, "error_message": str(e)})


# ---------------------------------------------------------------------------
# Protected endpoints
# ---------------------------------------------------------------------------

@router.get("/me")
async def get_me(request: Request):
    """Return the authenticated user's profile."""
    user = _get_user(request)
    client = _get_service_client()

    try:
        response = (
            client.table("profiles")
            .select("id, email, full_name, avatar_url, role, org_id, created_at")
            .eq("id", user.user_id)
            .single()
            .execute()
        )
        if not response.data:
            return JSONResponse(status_code=404, content={"error": True, "error_message": "Profile not found"})
        return response.data
    except Exception as e:
        logger.error("[auth] Profile fetch error: %s", e)
        return JSONResponse(status_code=500, content={"error": True, "error_message": str(e)})


@router.post("/keys", dependencies=[Depends(require_role("admin", "editor"))])
async def create_api_key(body: CreateKeyRequest, request: Request):
    """Generate a new API key. The raw key is returned ONCE — store it safely."""
    user = _get_user(request)
    client = _get_service_client()

    if body.role not in ("admin", "editor", "viewer"):
        raise HTTPException(status_code=400, detail="Invalid role")

    raw_key = f"cwos_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:12]

    try:
        (
            client.table("api_keys")
            .insert({
                "key_hash": key_hash,
                "key_prefix": key_prefix,
                "name": body.name,
                "owner_id": user.user_id,
                "org_id": user.org_id,
                "role": body.role,
                "scopes": body.scopes,
            })
            .execute()
        )
        return {
            "key": raw_key,
            "key_prefix": key_prefix,
            "name": body.name,
            "role": body.role,
            "message": "Save this key — it will not be shown again.",
        }
    except Exception as e:
        logger.error("[auth] Key creation error: %s", e)
        return JSONResponse(status_code=500, content={"error": True, "error_message": str(e)})


@router.get("/keys")
async def list_api_keys(request: Request):
    """List the authenticated user's API keys (prefix only)."""
    user = _get_user(request)
    client = _get_service_client()

    try:
        response = (
            client.table("api_keys")
            .select("id, key_prefix, name, role, scopes, last_used, expires_at, is_active, created_at")
            .eq("owner_id", user.user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"keys": response.data or []}
    except Exception as e:
        logger.error("[auth] Key list error: %s", e)
        return JSONResponse(status_code=500, content={"error": True, "error_message": str(e)})


@router.delete("/keys/{key_id}")
async def revoke_api_key(key_id: str, request: Request):
    """Soft-delete an API key (set is_active=false)."""
    user = _get_user(request)
    client = _get_service_client()

    try:
        response = (
            client.table("api_keys")
            .update({"is_active": False})
            .eq("id", key_id)
            .eq("owner_id", user.user_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Key not found or not owned by you")
        return {"message": "Key revoked", "key_id": key_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[auth] Key revoke error: %s", e)
        return JSONResponse(status_code=500, content={"error": True, "error_message": str(e)})
