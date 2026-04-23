"""Singleton Supabase client for Clay Webhook OS.

Uses the service role key (bypasses RLS) for all server-side operations.
Auth/authz is enforced at the FastAPI middleware layer, not via RLS.

Graceful degradation: if SUPABASE_URL is not configured, get_client()
returns None and all callers skip Supabase operations.
"""

import logging

from app.config import settings
from supabase import Client, create_client

logger = logging.getLogger("clay-webhook-os")

_client: Client | None = None
_initialized: bool = False


def get_client() -> Client | None:
    """Return the singleton Supabase client, or None if not configured."""
    global _client, _initialized

    if _initialized:
        return _client

    _initialized = True

    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.info("[supabase] Not configured — Supabase features disabled")
        return None

    try:
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        logger.info("[supabase] Client initialized: %s", settings.supabase_url)
    except Exception as exc:
        logger.error("[supabase] Failed to initialize client: %s", exc)
        _client = None

    return _client


def reset_client() -> None:
    """Reset the singleton (useful for testing)."""
    global _client, _initialized
    _client = None
    _initialized = False
