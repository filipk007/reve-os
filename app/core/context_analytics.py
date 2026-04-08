"""Context Analytics — logs what context was loaded per execution.

After the rack assembles a prompt, this module records the load manifest
to the context_load_log Supabase table. This gives you visibility into:

    - Which knowledge base files are loaded most often
    - Token distribution across slots (is the knowledge slot too heavy?)
    - Whether the semantic slot is finding useful context
    - Assembly performance (how long does prompt building take?)

The analytics are fire-and-forget — failures don't block execution.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.context_rack import RackContext

logger = logging.getLogger("clay-webhook-os")


async def log_context_load(
    ctx: RackContext,
    manifest: list[dict],
    *,
    execution_id: str | None = None,
    model: str | None = None,
    assembly_ms: int = 0,
    source_mode: str = "file",
) -> None:
    """Log what context was loaded for a single execution.

    Writes to the context_load_log Supabase table if Supabase is configured.
    Always logs to Python logger regardless.

    Args:
        ctx: The RackContext after assembly (contains pieces and metadata).
        manifest: The slot manifest from rack.assemble() — list of
                  {slot, items, tokens, source} dicts.
        execution_id: Links to skill_executions table (optional).
        model: Which model was used (sonnet/opus/haiku).
        assembly_ms: How long assembly took in milliseconds.
        source_mode: "file" | "supabase" | "hybrid".
    """
    total_context_tokens = sum(p.token_estimate for p in ctx.pieces)
    # Total prompt = context + overhead (system, skill, data, reminders)
    total_prompt_tokens = total_context_tokens  # Rough — the actual prompt includes formatting

    items_loaded = [p.path for p in ctx.pieces if p.path]

    # Always log to Python logger
    logger.info(
        "[rack:analytics] skill=%s client=%s slots=%d items=%d context_tokens=%d assembly_ms=%d",
        ctx.skill_name,
        ctx.client_slug or "-",
        len(manifest),
        len(items_loaded),
        total_context_tokens,
        assembly_ms,
    )

    # Write to Supabase if configured
    try:
        from app.core.supabase_client import get_client
        sb = get_client()
        if sb is None:
            return

        sb.table("context_load_log").insert({
            "execution_id": execution_id,
            "skill": ctx.skill_name,
            "client_slug": ctx.client_slug,
            "model": model,
            "rack_slots": manifest,
            "context_items_loaded": items_loaded,
            "total_context_tokens": total_context_tokens,
            "total_prompt_tokens": total_prompt_tokens,
            "source_mode": source_mode,
            "assembly_ms": assembly_ms,
        }).execute()

    except Exception as e:
        # Fire-and-forget — don't let analytics failures block execution
        logger.warning("[rack:analytics] Failed to log to Supabase: %s", e)
