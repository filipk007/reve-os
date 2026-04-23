"""Supabase-backed enrichment cache for Clay Webhook OS.

Provides entity-level caching of enrichment results (external API calls
and Claude skill outputs). Two-tier architecture:

- L1: In-memory ResultCache (fast, request-level, lost on restart)
- L2: This module — Supabase enrichment_cache (persistent, entity-level)

All methods degrade gracefully: if Supabase is not configured or
unreachable, they return None and callers fall through to the
existing code paths.
"""

import hashlib
import json
import logging

from app.config import settings
from app.core.entity_utils import extract_entity_key

logger = logging.getLogger("clay-webhook-os")

# Default TTL when no config found (7 days)
_DEFAULT_TTL = 604800

# In-memory TTL config cache (avoids querying Supabase for every lookup)
_ttl_config: dict[str, int] = {}
_ttl_config_loaded: bool = False


class EnrichmentCache:
    """Supabase-backed enrichment result cache."""

    def __init__(self):
        self._client = None
        self._enabled = False
        self._hits = 0
        self._misses = 0

    async def init(self) -> None:
        """Initialize the Supabase client. Call during app startup."""
        if not settings.supabase_cache_enabled:
            logger.info("[enrichment-cache] Disabled via config")
            return

        from app.core.supabase_client import get_client

        self._client = get_client()
        if self._client:
            self._enabled = True
            await self._load_ttl_config()
            logger.info("[enrichment-cache] Initialized with Supabase")
        else:
            logger.info("[enrichment-cache] No Supabase client — operating in passthrough mode")

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def stats(self) -> dict:
        total = self._hits + self._misses
        return {
            "enabled": self._enabled,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / total, 3) if total > 0 else 0.0,
        }

    # -------------------------------------------------------------------------
    # Cache Operations
    # -------------------------------------------------------------------------

    async def get(
        self,
        entity_type: str,
        entity_id: str,
        provider: str,
        operation: str,
    ) -> dict | None:
        """Look up a cached enrichment result.

        Returns the cached result dict, or None on miss/expiry/error.
        """
        if not self._enabled:
            return None

        try:
            response = (
                self._client.table("enrichment_cache")
                .select("id, result, expires_at, hit_count")
                .eq("entity_type", entity_type)
                .eq("entity_id", entity_id)
                .eq("provider", provider)
                .eq("operation", operation)
                .single()
                .execute()
            )

            if not response.data:
                self._misses += 1
                return None

            row = response.data

            # Check expiry (belt-and-suspenders — query could also filter)
            from datetime import datetime, timezone

            expires_at = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
            if expires_at < datetime.now(timezone.utc):
                self._misses += 1
                return None

            # Increment hit count (fire-and-forget)
            try:
                self._client.table("enrichment_cache").update(
                    {"hit_count": row["hit_count"] + 1}
                ).eq("id", row["id"]).execute()
            except Exception:
                pass  # Non-critical

            self._hits += 1
            logger.info(
                "[enrichment-cache] HIT: %s/%s provider=%s op=%s (hits=%d)",
                entity_type, entity_id, provider, operation, row["hit_count"] + 1,
            )
            return row["result"]

        except Exception as exc:
            logger.warning("[enrichment-cache] GET error: %s", exc)
            self._misses += 1
            return None

    async def put(
        self,
        entity_type: str,
        entity_id: str,
        provider: str,
        operation: str,
        result: dict,
        ttl_seconds: int | None = None,
    ) -> None:
        """Store an enrichment result in the cache (upsert)."""
        if not self._enabled:
            return

        if ttl_seconds is None:
            ttl_seconds = self._get_ttl(provider, operation)

        result_hash = hashlib.sha256(
            json.dumps(result, sort_keys=True, default=str).encode()
        ).hexdigest()[:16]

        try:
            self._client.table("enrichment_cache").upsert(
                {
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "provider": provider,
                    "operation": operation,
                    "result": result,
                    "result_hash": result_hash,
                    "ttl_seconds": ttl_seconds,
                    "hit_count": 0,
                    "expires_at": _expires_at_iso(ttl_seconds),
                },
                on_conflict="entity_type,entity_id,provider,operation",
            ).execute()

            logger.info(
                "[enrichment-cache] PUT: %s/%s provider=%s op=%s ttl=%ds",
                entity_type, entity_id, provider, operation, ttl_seconds,
            )
        except Exception as exc:
            logger.warning("[enrichment-cache] PUT error: %s", exc)

    async def get_for_entity(
        self,
        entity_type: str,
        entity_id: str,
    ) -> list[dict]:
        """Get all cached results for an entity (all providers/operations)."""
        if not self._enabled:
            return []

        try:
            response = (
                self._client.table("enrichment_cache")
                .select("provider, operation, result, hit_count, created_at, expires_at")
                .eq("entity_type", entity_type)
                .eq("entity_id", entity_id)
                .gte("expires_at", "now()")
                .execute()
            )
            return response.data or []
        except Exception as exc:
            logger.warning("[enrichment-cache] GET entity error: %s", exc)
            return []

    # -------------------------------------------------------------------------
    # Entity-Level Skill Result Cache (L2 for webhook flow)
    # -------------------------------------------------------------------------

    async def get_skill_result(
        self,
        data: dict,
        skill: str,
    ) -> dict | None:
        """Check if we have a cached Claude skill result for this entity.

        Extracts entity key from the data dict, then looks up
        provider='claude', operation=skill_name.
        """
        entity = extract_entity_key(data)
        if entity is None:
            return None
        entity_type, entity_id = entity
        return await self.get(entity_type, entity_id, "claude", skill)

    async def put_skill_result(
        self,
        data: dict,
        skill: str,
        result: dict,
        ttl_seconds: int | None = None,
    ) -> None:
        """Cache a Claude skill result at the entity level."""
        entity = extract_entity_key(data)
        if entity is None:
            return
        entity_type, entity_id = entity
        await self.put(entity_type, entity_id, "claude", skill, result, ttl_seconds)

    # -------------------------------------------------------------------------
    # API Call Logging
    # -------------------------------------------------------------------------

    async def log_api_call(
        self,
        provider: str,
        operation: str,
        entity_type: str | None = None,
        entity_id: str | None = None,
        duration_ms: int | None = None,
        cache_hit: bool = False,
        skill: str | None = None,
        client_slug: str | None = None,
        error_message: str | None = None,
        response_status: int | None = None,
    ) -> None:
        """Log an external API call for cost tracking and audit."""
        if not self._enabled:
            return

        try:
            self._client.table("api_call_log").insert(
                {
                    "provider": provider,
                    "operation": operation,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "duration_ms": duration_ms,
                    "cache_hit": cache_hit,
                    "skill": skill,
                    "client_slug": client_slug,
                    "error_message": error_message,
                    "response_status": response_status,
                }
            ).execute()
        except Exception as exc:
            logger.warning("[enrichment-cache] API log error: %s", exc)

    # -------------------------------------------------------------------------
    # TTL Configuration
    # -------------------------------------------------------------------------

    def _get_ttl(self, provider: str, operation: str) -> int:
        """Look up TTL for a provider/operation combo. Falls back to defaults."""
        # Check operation-specific first, then provider-level
        for key in (f"{provider}.{operation}", operation, provider):
            if key in _ttl_config:
                return _ttl_config[key]
        return _DEFAULT_TTL

    async def _load_ttl_config(self) -> None:
        """Load TTL config from Supabase into memory."""
        global _ttl_config, _ttl_config_loaded
        if _ttl_config_loaded:
            return

        try:
            response = (
                self._client.table("cache_ttl_config")
                .select("scope, key, ttl_seconds")
                .execute()
            )
            for row in response.data or []:
                _ttl_config[row["key"]] = row["ttl_seconds"]
            _ttl_config_loaded = True
            logger.info("[enrichment-cache] Loaded %d TTL configs", len(_ttl_config))
        except Exception as exc:
            logger.warning("[enrichment-cache] Failed to load TTL config: %s", exc)


def _expires_at_iso(ttl_seconds: int) -> str:
    """Return an ISO-8601 timestamp ttl_seconds from now."""
    from datetime import datetime, timedelta, timezone

    return (datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)).isoformat()
