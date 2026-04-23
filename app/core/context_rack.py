"""Context Rack — modular, pluggable context injection pipeline.

The rack formalizes the existing build_prompt() layers into independent "slots."
Each slot fetches context from a source (files, Supabase, or inline generation)
and returns ContextPiece objects. The rack iterates slots in order, collects
all pieces, and composes the final prompt string.

Architecture overview:
    ContextRack  — The pipeline runner. Holds an ordered list of slots.
    ContextSlot  — Abstract base class. Each subclass knows how to fetch one
                   type of context (system instructions, skill body, knowledge
                   base files, etc.).
    ContextPiece — One unit of content produced by a slot. Carries the text
                   plus metadata (source, token estimate, role label).
    RackContext  — Request-scoped state bag passed to every slot. Contains the
                   skill name, input data, and injected dependencies (stores).

Design: Strategy Pattern + Pipeline Pattern.
    - Strategy: each slot is a different algorithm behind the same interface.
    - Pipeline: slots run in sequence, building up the prompt incrementally.
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from app.config import settings

if TYPE_CHECKING:
    from app.core.context_index import ContextIndex
    from app.core.learning_engine import LearningEngine
    from app.core.memory_store import MemoryStore

logger = logging.getLogger("clay-webhook-os")


# ── Data structures ──────────────────────────────────────────────────────────


@dataclass
class ContextPiece:
    """One unit of context content produced by a slot.

    Think of it as one file's worth of content, tagged with metadata about
    where it came from and what role it plays in the prompt.
    """

    path: str               # Identifier — file path or DB slug
    content: str            # The actual text to inject
    role: str               # Human-readable label: "Methodology & frameworks"
    source: str             # "file" | "supabase" | "inline"
    token_estimate: int     # len(content) // 4 — rough approximation
    slot_name: str          # Which slot produced this piece


@dataclass
class RackContext:
    """Request-scoped state passed through the entire slot pipeline.

    Every slot receives this and can read from it. Slots add their output
    to `pieces` and track loaded paths in `seen_paths` to avoid duplicates.

    This is the "shared workspace" that flows through the assembly line.
    """

    # ── Request data ────────────────────────────────────────────
    skill_name: str
    skill_content: str              # The skill.md body (frontmatter stripped)
    skill_config: dict              # The skill's frontmatter dict
    data: dict                      # The input payload (row data from Clay)
    instructions: str | None = None # Optional campaign-level override
    output_format: str = "json"     # "json" | "markdown" | "html" | "text"

    # ── Derived convenience fields ──────────────────────────────
    client_slug: str | None = None
    signal_type: str | None = None
    title: str | None = None        # Prospect's job title (for persona matching)
    industry: str | None = None

    # ── Injected dependencies (stores) ──────────────────────────
    memory_store: MemoryStore | None = None
    context_index: ContextIndex | None = None
    learning_engine: LearningEngine | None = None

    # ── Accumulated output ──────────────────────────────────────
    pieces: list[ContextPiece] = field(default_factory=list)
    seen_paths: set[str] = field(default_factory=set)

    # ── Flags ───────────────────────────────────────────────────
    skip_semantic: bool = False
    skip_defaults: bool = False

    @classmethod
    def from_request(
        cls,
        skill_name: str,
        skill_content: str,
        skill_config: dict,
        data: dict,
        *,
        instructions: str | None = None,
        output_format: str = "json",
        memory_store: MemoryStore | None = None,
        context_index: ContextIndex | None = None,
        learning_engine: LearningEngine | None = None,
        skip_semantic: bool = False,
    ) -> RackContext:
        """Factory that extracts convenience fields from data."""
        return cls(
            skill_name=skill_name,
            skill_content=skill_content,
            skill_config=skill_config,
            data=data,
            instructions=instructions,
            output_format=output_format,
            client_slug=data.get("client_slug"),
            signal_type=data.get("signal_type"),
            title=data.get("title"),
            industry=data.get("industry"),
            memory_store=memory_store,
            context_index=context_index,
            learning_engine=learning_engine,
            skip_semantic=skip_semantic,
            skip_defaults=skill_config.get("skip_defaults", False),
        )


# ── Abstract slot ────────────────────────────────────────────────────────────


class ContextSlot(ABC):
    """Base class for every rack slot.

    Each subclass implements `load()` to fetch context from its source.
    The rack calls load() on each slot in order, passing the shared RackContext.

    Subclasses live in context_providers.py.
    """

    def __init__(self, name: str, order: int, *, enabled: bool = True):
        self.name = name
        self.order = order
        self.enabled = enabled

    @abstractmethod
    async def load(self, ctx: RackContext) -> list[ContextPiece]:
        """Fetch context pieces for this slot.

        Returns a list of ContextPiece objects. May return an empty list
        if this slot has nothing to contribute for the current request.
        """
        ...


# ── Priority ordering (same as context_assembler.py) ─────────────────────────

# Maps category to a sort key. Lower = loads earlier (generic).
# This is the same ordering as _PRIORITY_ORDER in context_assembler.py,
# now expressed as weights that map to the priority_weight column in Supabase.
CATEGORY_PRIORITY: dict[str, int] = {
    "knowledge_base/frameworks/": 10,
    "knowledge_base/voice/": 20,
    "knowledge_base/_defaults/": 25,
    "knowledge_base/objections/": 30,
    "knowledge_base/competitive/": 40,
    "knowledge_base/sequences/": 50,
    "knowledge_base/signals/": 60,
    "knowledge_base/personas/": 70,
    "knowledge_base/industries/": 80,
    "clients/": 90,
}

CATEGORY_ROLES: dict[str, str] = {
    "frameworks": "Methodology & frameworks",
    "voice": "Writing style & tone",
    "_defaults": "Writing style & tone",
    "objections": "Objection handling",
    "competitive": "Competitive intelligence",
    "sequences": "Sequence templates",
    "signals": "Signal patterns",
    "personas": "Persona profiles",
    "industries": "Industry context",
    "clients": "Client profile",
}


def get_context_priority(path: str) -> int:
    """Return sort key for a context file path. Lower = more generic."""
    for prefix, weight in CATEGORY_PRIORITY.items():
        if path.startswith(prefix):
            return weight
    return 100  # Unknown paths sort to the end


def get_context_role(path: str) -> str:
    """Return a human-readable role label for a context file path."""
    parts = path.rstrip("/").split("/")
    category = parts[0] if parts[0] != "knowledge_base" else parts[1] if len(parts) > 1 else parts[0]
    return CATEGORY_ROLES.get(category, "Reference")


# ── The Rack ─────────────────────────────────────────────────────────────────


class ContextRack:
    """The pipeline runner — iterates slots in order, composes the prompt.

    Usage:
        rack = ContextRack(slots=[SystemSlot(...), SkillSlot(...), ...])
        ctx = RackContext.from_request(...)
        prompt, manifest = await rack.assemble(ctx)
    """

    def __init__(self, slots: list[ContextSlot]):
        # Sort slots by their order attribute (lowest first = runs first)
        self._slots = sorted(slots, key=lambda s: s.order)

    async def assemble(self, ctx: RackContext) -> tuple[str, list[dict]]:
        """Run all enabled slots and compose the final prompt.

        Returns:
            (prompt_string, manifest)
            - prompt_string: the full prompt, identical to build_prompt() output
            - manifest: list of dicts describing what each slot produced
        """
        start_ms = time.monotonic()
        manifest: list[dict] = []

        # ── Run each slot in order ──
        for slot in self._slots:
            if not slot.enabled:
                continue

            pieces = await slot.load(ctx)

            # Track what this slot produced
            slot_tokens = sum(p.token_estimate for p in pieces)
            manifest.append({
                "slot": slot.name,
                "items": len(pieces),
                "tokens": slot_tokens,
                "source": pieces[0].source if pieces else "none",
            })

            # Add pieces to the shared context
            for piece in pieces:
                ctx.pieces.append(piece)
                if piece.path:
                    ctx.seen_paths.add(piece.path)

        # ── Compose the prompt string ──
        prompt = self._compose_prompt(ctx)

        elapsed_ms = int((time.monotonic() - start_ms) * 1000)

        # Log prompt size (same behavior as build_prompt)
        char_count = len(prompt)
        token_est = char_count // 4
        if token_est > settings.prompt_size_warn_tokens:
            logger.warning(
                "[rack] Large prompt: chars=%d, tokens_est=%d (threshold=%d)",
                char_count, token_est, settings.prompt_size_warn_tokens,
            )
        else:
            logger.info("[rack] chars=%d, tokens_est=%d, assembly_ms=%d", char_count, token_est, elapsed_ms)

        return prompt, manifest

    def _compose_prompt(self, ctx: RackContext) -> str:
        """Combine all pieces into the final prompt string.

        This reproduces the exact output format of build_prompt() so that
        switching between the old function and the rack produces identical results.

        The key insight: build_prompt() concatenates pieces with specific
        separator patterns. We replicate those exactly.
        """
        parts: list[str] = []

        # Group pieces by slot name for ordered composition
        pieces_by_slot: dict[str, list[ContextPiece]] = {}
        for piece in ctx.pieces:
            pieces_by_slot.setdefault(piece.slot_name, []).append(piece)

        # ── System instruction (slot: system) ──
        system_pieces = pieces_by_slot.get("system", [])
        if system_pieces:
            parts.append(system_pieces[0].content)

        # ── Skill body (slot: skill) ──
        skill_pieces = pieces_by_slot.get("skill", [])
        if skill_pieces:
            parts.append(f"\n\n# Skill Instructions\n\n{skill_pieces[0].content}")

        # ── Memory (slot: memory) ──
        memory_pieces = pieces_by_slot.get("memory", [])
        if memory_pieces:
            parts.append(f"\n\n---\n\n{memory_pieces[0].content}")

        # ── Learnings (slot: learnings) ──
        learning_pieces = pieces_by_slot.get("learnings", [])
        if learning_pieces:
            parts.append(f"\n\n---\n\n{learning_pieces[0].content}")

        # ── Context files (slots: defaults, knowledge, semantic) ──
        # These are all "context files" and get merged, sorted by priority,
        # and rendered with a manifest header — same as build_prompt() Layer 3.
        context_pieces = (
            pieces_by_slot.get("defaults", [])
            + pieces_by_slot.get("knowledge", [])
            + pieces_by_slot.get("semantic", [])
        )
        if context_pieces:
            # Sort by priority (generic → specific)
            sorted_pieces = sorted(context_pieces, key=lambda p: get_context_priority(p.path))

            parts.append(f"\n\n---\n\n# Loaded Context ({len(sorted_pieces)} files)\n")
            # Manifest
            for i, piece in enumerate(sorted_pieces, 1):
                parts.append(f"{i}. `{piece.path}` — {piece.role}")
            parts.append("")
            # Full content
            for piece in sorted_pieces:
                parts.append(f"\n## {piece.path}\n\n{piece.content}")

        # ── Data payload (slot: data) ──
        data_pieces = pieces_by_slot.get("data", [])
        if data_pieces:
            parts.append(f"\n\n---\n\n# Data to Process\n\n{data_pieces[0].content}")

        # ── Campaign instructions (slot: campaign) ──
        campaign_pieces = pieces_by_slot.get("campaign", [])
        if campaign_pieces:
            parts.append(f"\n\n## Campaign Instructions\n{campaign_pieces[0].content}")

        # ── Final reminder (slot: reminder) ──
        reminder_pieces = pieces_by_slot.get("reminder", [])
        if reminder_pieces:
            parts.append(f"\n\n{reminder_pieces[0].content}")

        return "".join(parts)
