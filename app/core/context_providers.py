"""Context Providers — concrete slot implementations for the Context Rack.

Each class here is one "slot" in the rack pipeline. They implement the
ContextSlot.load() interface and know how to fetch their specific type
of context from either files or Supabase.

Slot inventory (matching build_prompt() layers):
    SystemInstructionSlot  — Format-aware preamble (Layer 1)
    SkillSlot              — Skill body from skill.md (Layer 2)
    MemorySlot             — Prior entity knowledge (Layer 2.5)
    LearningsSlot          — Persistent corrections (Layer 2.7)
    DefaultsSlot           — Auto-loaded defaults (Layer 3 sub-layer)
    KnowledgeSlot          — Explicit context refs (Layer 3 sub-layer)
    SemanticSlot           — Auto-discovered context (Layer 3.5)
    DataSlot               — Input JSON payload (Layer 4)
    CampaignSlot           — Optional override instructions (Layer 5)
    ReminderSlot           — Format-aware closing (Layer 6)

Each slot's load() method returns list[ContextPiece]. Empty list = "I have
nothing to contribute for this request." The rack skips it gracefully.
"""

from __future__ import annotations

import json
import logging
import re

from app.config import settings
from app.core.context_rack import ContextPiece, ContextSlot, RackContext, get_context_role

logger = logging.getLogger("clay-webhook-os")


# ── Slot 1: System Instructions ──────────────────────────────────────────────
# The very first thing in every prompt. Tells Claude what output format to use.
# This is "inline" — no I/O, just picks the right string based on output_format.


class SystemInstructionSlot(ContextSlot):
    """Format-aware system preamble.

    Matches build_prompt() Layer 1 exactly:
    - json → "You are a JSON generation engine..."
    - markdown → "You are a content generation engine... Markdown..."
    - html → "You are a content generation engine... HTML..."
    - text → "You are a content generation engine... plain text..."
    """

    _INSTRUCTIONS = {
        "json": (
            "You are a JSON generation engine. Return ONLY valid JSON — "
            "no markdown fences, no explanation, no preamble. Just the raw JSON object."
        ),
        "markdown": (
            "You are a content generation engine. Return your output as clean Markdown. "
            "No JSON wrapping, no code fences around the entire output."
        ),
        "html": (
            "You are a content generation engine. Return your output as clean HTML. "
            "No JSON wrapping, no markdown, no code fences."
        ),
        "text": (
            "You are a content generation engine. Return your output as plain text. "
            "No JSON wrapping, no markdown, no code fences."
        ),
    }

    async def load(self, ctx: RackContext) -> list[ContextPiece]:
        instruction = self._INSTRUCTIONS.get(ctx.output_format, self._INSTRUCTIONS["text"])
        return [ContextPiece(
            path="",
            content=instruction,
            role="System instruction",
            source="inline",
            token_estimate=len(instruction) // 4,
            slot_name=self.name,
        )]


# ── Slot 2: Skill Body ──────────────────────────────────────────────────────
# The skill.md content (with frontmatter stripped). Always file-based because
# skills are authored as markdown files and that's unlikely to change.


class SkillSlot(ContextSlot):
    """Loads the skill body from the RackContext.

    The skill content is already loaded by the caller and passed via
    ctx.skill_content, so this slot just wraps it as a ContextPiece.
    No I/O needed — the caller (webhook.py) already called load_skill().
    """

    async def load(self, ctx: RackContext) -> list[ContextPiece]:
        if not ctx.skill_content:
            return []
        return [ContextPiece(
            path=f"skills/{ctx.skill_name}/skill.md",
            content=ctx.skill_content,
            role="Skill instructions",
            source="file",
            token_estimate=len(ctx.skill_content) // 4,
            slot_name=self.name,
        )]


# ── Slot 3: Memory ──────────────────────────────────────────────────────────
# Prior knowledge about the entity (company/contact) being processed.
# Queries the MemoryStore, which looks up past skill outputs for this entity.


class MemorySlot(ContextSlot):
    """Queries MemoryStore for prior knowledge about the entity.

    MemoryStore.query(data) extracts the entity key (domain or email) from
    the data payload and returns past MemoryEntry objects. We format them
    into a readable prompt section using MemoryStore.format_for_prompt().
    """

    async def load(self, ctx: RackContext) -> list[ContextPiece]:
        if ctx.memory_store is None:
            return []

        entries = ctx.memory_store.query(ctx.data)
        if not entries:
            return []

        memory_text = ctx.memory_store.format_for_prompt(entries)
        logger.info("[rack:memory] Injected %d memory entries", len(entries))

        return [ContextPiece(
            path="",
            content=memory_text,
            role="Prior entity knowledge",
            source="file",
            token_estimate=len(memory_text) // 4,
            slot_name=self.name,
        )]


# ── Slot 4: Learnings ───────────────────────────────────────────────────────
# Persistent corrections extracted from past thumbs-down feedback.
# The LearningEngine stores these in knowledge_base/learnings/{client}.md.


class LearningsSlot(ContextSlot):
    """Injects learnings from past feedback corrections.

    LearningEngine.format_for_prompt() returns a formatted section like:
        # Learnings from Past Feedback (3 entries)
        IMPORTANT: These are corrections from human reviewers...
        - [email-gen] (twelve-labs) Don't mention competitors by name (2026-03-15)

    The skill name is extracted from the skill content's first H1 heading,
    matching the same logic as build_prompt().
    """

    async def load(self, ctx: RackContext) -> list[ContextPiece]:
        if ctx.learning_engine is None:
            return []

        # Extract skill name from first H1 heading (same as build_prompt)
        skill_name = None
        for line in ctx.skill_content.splitlines():
            if line.startswith("# "):
                skill_name = line[2:].strip().split("—")[0].strip().lower().replace(" ", "-")
                break

        learnings_text = ctx.learning_engine.format_for_prompt(
            client_slug=ctx.client_slug,
            skill=skill_name,
        )
        if not learnings_text:
            return []

        logger.info("[rack:learnings] Injected learnings for client=%s skill=%s", ctx.client_slug, skill_name)

        return [ContextPiece(
            path="",
            content=learnings_text,
            role="Feedback corrections",
            source="file",
            token_estimate=len(learnings_text) // 4,
            slot_name=self.name,
        )]


# ── Slot 5: Defaults ────────────────────────────────────────────────────────
# Auto-loaded context files from knowledge_base/_defaults/.
# These load for EVERY skill unless the skill opts out with skip_defaults: true.


class DefaultsSlot(ContextSlot):
    """Loads default context files (knowledge_base/_defaults/*.md).

    Defaults are like a "base layer" — writing style guides, shared rules,
    etc. Every skill gets them unless it explicitly opts out.

    In file mode: reads from knowledge_base/_defaults/ directory.
    In supabase mode: queries context_items WHERE is_default = true.
    """

    async def load(self, ctx: RackContext) -> list[ContextPiece]:
        if ctx.skip_defaults:
            return []

        pieces: list[ContextPiece] = []
        defaults_dir = settings.knowledge_dir / "_defaults"

        if not defaults_dir.exists():
            return []

        for f in sorted(defaults_dir.iterdir()):
            if f.suffix != ".md":
                continue
            rel_path = f"knowledge_base/_defaults/{f.name}"
            if rel_path in ctx.seen_paths:
                continue
            content = f.read_text()
            pieces.append(ContextPiece(
                path=rel_path,
                content=content,
                role=get_context_role(rel_path),
                source="file",
                token_estimate=len(content) // 4,
                slot_name=self.name,
            ))

        return pieces


# ── Slot 6: Knowledge ───────────────────────────────────────────────────────
# Explicit context refs from the skill's frontmatter or body.
# This is the main slot — loads frameworks, personas, client profiles, etc.


class KnowledgeSlot(ContextSlot):
    """Loads explicit context files referenced by the skill.

    Sources of context refs (in order of preference):
    1. Skill frontmatter `context:` list (e.g. context: [knowledge_base/frameworks/pvc.md])
    2. Regex-parsed bullet refs from the skill body (fallback)
    3. Industry auto-load (if data.industry matches a file in industries/)

    Each ref goes through:
    - Template variable resolution ({{client_slug}} → actual slug)
    - Smart filtering (client profiles filtered by skill, signals by type)
    - Deduplication against already-loaded paths

    In file mode: reads from disk (reuses skill_loader functions).
    In supabase mode: queries context_items with applicable_* filters.
    """

    async def load(self, ctx: RackContext) -> list[ContextPiece]:
        # Import here to avoid circular imports (skill_loader imports context_filter)
        from app.core.skill_loader import (
            _maybe_filter_content,
            load_file,
            parse_context_refs,
            resolve_template_vars,
        )

        pieces: list[ContextPiece] = []

        # Get context refs from frontmatter or regex
        refs = ctx.skill_config.get("context", []) or []
        if not refs:
            refs = parse_context_refs(ctx.skill_content)

        context_max_chars = ctx.skill_config.get("context_max_chars")

        for ref in refs:
            resolved = resolve_template_vars(ref, ctx.data)
            if "{{" in resolved:
                continue  # Unresolved template var — skip
            if resolved in ctx.seen_paths:
                continue  # Already loaded — skip

            content = load_file(resolved)
            if not content:
                continue

            # Apply smart filtering (client profile sections, signal sections)
            content = _maybe_filter_content(resolved, content, ctx.data, ctx.skill_name)

            # Truncate if skill has context_max_chars set
            if context_max_chars and isinstance(context_max_chars, int) and len(content) > context_max_chars:
                content = content[:context_max_chars] + "\n\n[...truncated]"

            pieces.append(ContextPiece(
                path=resolved,
                content=content,
                role=get_context_role(resolved),
                source="file",
                token_estimate=len(content) // 4,
                slot_name=self.name,
            ))

        # ── Industry auto-load ──
        if ctx.industry:
            slug = re.sub(r"[^a-z0-9]+", "-", ctx.industry.lower()).strip("-")
            industries_dir = settings.knowledge_dir / "industries"
            if industries_dir.exists():
                industry_file = industries_dir / f"{slug}.md"
                rel_path = f"knowledge_base/industries/{slug}.md"
                if industry_file.exists() and rel_path not in ctx.seen_paths:
                    content = industry_file.read_text()
                    if context_max_chars and isinstance(context_max_chars, int) and len(content) > context_max_chars:
                        content = content[:context_max_chars] + "\n\n[...truncated]"
                    pieces.append(ContextPiece(
                        path=rel_path,
                        content=content,
                        role="Industry context",
                        source="file",
                        token_estimate=len(content) // 4,
                        slot_name=self.name,
                    ))

        return pieces


# ── Slot 7: Semantic Discovery ───────────────────────────────────────────────
# Auto-discovers relevant context using TF-IDF (file mode) or Postgres FTS.


class SemanticSlot(ContextSlot):
    """Auto-discovers relevant context based on the input data.

    In file mode: uses ContextIndex (TF-IDF) to search knowledge_base/ and
    clients/ for files whose content is relevant to the input data fields
    (company_name, industry, title, etc.). Returns top_k results.

    In supabase mode: uses Postgres full-text search (ts_rank + plainto_tsquery)
    on the context_items.fts_vector column.

    Deduplicates against ctx.seen_paths so we don't re-inject files that
    were already loaded by the KnowledgeSlot or DefaultsSlot.
    """

    def __init__(self, name: str, order: int, *, enabled: bool = True, top_k: int = 3):
        super().__init__(name, order, enabled=enabled)
        self.top_k = top_k

    async def load(self, ctx: RackContext) -> list[ContextPiece]:
        if ctx.skip_semantic or ctx.context_index is None:
            return []

        from app.core.skill_loader import load_file

        pieces: list[ContextPiece] = []
        semantic_hits = ctx.context_index.search_by_data(ctx.data, top_k=self.top_k)

        for rel_path, score in semantic_hits:
            if rel_path in ctx.seen_paths:
                continue

            content = load_file(rel_path)
            if not content:
                continue

            logger.info("[rack:semantic] %s (score=%.3f)", rel_path, score)

            pieces.append(ContextPiece(
                path=rel_path,
                content=content,
                role=get_context_role(rel_path),
                source="file",
                token_estimate=len(content) // 4,
                slot_name=self.name,
            ))

        return pieces


# ── Slot 8: Data Payload ─────────────────────────────────────────────────────
# The actual input data (row from Clay, form submission, etc.) as JSON.


class DataSlot(ContextSlot):
    """Injects the input data payload as JSON.

    This is always inline — the data comes from the request, not from
    any storage backend. We just serialize it to JSON.
    """

    async def load(self, ctx: RackContext) -> list[ContextPiece]:
        data_str = json.dumps(ctx.data)
        return [ContextPiece(
            path="",
            content=data_str,
            role="Input data",
            source="inline",
            token_estimate=len(data_str) // 4,
            slot_name=self.name,
        )]


# ── Slot 9: Campaign Instructions ────────────────────────────────────────────
# Optional override instructions that come from campaign-level configuration.


class CampaignSlot(ContextSlot):
    """Injects optional campaign-level instructions.

    These come from the request's `instructions` field — they're
    campaign-specific overrides that supplement the skill's default behavior.
    """

    async def load(self, ctx: RackContext) -> list[ContextPiece]:
        if not ctx.instructions:
            return []
        return [ContextPiece(
            path="",
            content=ctx.instructions,
            role="Campaign instructions",
            source="inline",
            token_estimate=len(ctx.instructions) // 4,
            slot_name=self.name,
        )]


# ── Slot 10: Reminder ───────────────────────────────────────────────────────
# Format-aware closing instruction. Reinforces the output format at the end.


class ReminderSlot(ContextSlot):
    """Format-aware closing reminder.

    Matches build_prompt() Layer 6 exactly. Reinforces the output format
    at the very end of the prompt so the model doesn't drift.
    """

    _REMINDERS = {
        "json": "Return ONLY the JSON object. No markdown, no explanation.",
        "markdown": "Return your response as clean Markdown.",
        "html": "Return your response as clean HTML.",
        "text": "Return your response as plain text.",
    }

    async def load(self, ctx: RackContext) -> list[ContextPiece]:
        reminder = self._REMINDERS.get(ctx.output_format, self._REMINDERS["text"])
        return [ContextPiece(
            path="",
            content=reminder,
            role="Format reminder",
            source="inline",
            token_estimate=len(reminder) // 4,
            slot_name=self.name,
        )]


# ── Factory: build default rack from config ──────────────────────────────────


def build_default_slots() -> list[ContextSlot]:
    """Create the default set of slots matching current build_prompt() behavior.

    This is the "hardcoded defaults" path — used when the rack config is
    loaded from code rather than from the context_rack_config Supabase table.
    """
    return [
        SystemInstructionSlot(name="system", order=10),
        SkillSlot(name="skill", order=20),
        MemorySlot(name="memory", order=30),
        LearningsSlot(name="learnings", order=40),
        DefaultsSlot(name="defaults", order=50),
        KnowledgeSlot(name="knowledge", order=60),
        SemanticSlot(name="semantic", order=70, top_k=3),
        DataSlot(name="data", order=80),
        CampaignSlot(name="campaign", order=85),
        ReminderSlot(name="reminder", order=90),
    ]
