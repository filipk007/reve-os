import json
import logging
from pathlib import Path
from typing import TYPE_CHECKING

from jinja2 import Environment, FileSystemLoader, StrictUndefined

from app.config import settings

if TYPE_CHECKING:
    from app.core.context_index import ContextIndex
    from app.core.context_rack import ContextRack
    from app.core.learning_engine import LearningEngine
    from app.core.memory_store import MemoryStore

logger = logging.getLogger("clay-webhook-os")

# Most-generic first → most-specific last (closest to data payload).
_PRIORITY_ORDER = [
    "knowledge_base/frameworks/",
    "knowledge_base/voice/",
    "knowledge_base/objections/",
    "knowledge_base/competitive/",
    "knowledge_base/sequences/",
    "clients/",
]

_CATEGORY_ROLES = {
    "frameworks": "Methodology & frameworks",
    "voice": "Writing style & tone",
    "objections": "Objection handling",
    "competitive": "Competitive intelligence",
    "sequences": "Sequence templates",
    "clients": "Client profile",
}


_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "prompts"

_env = Environment(
    loader=FileSystemLoader(_TEMPLATE_DIR),
    trim_blocks=False,
    lstrip_blocks=False,
    keep_trailing_newline=False,
    undefined=StrictUndefined,
    autoescape=False,
)


def _context_priority(ctx: dict[str, str]) -> int:
    path = ctx["path"]
    for i, prefix in enumerate(_PRIORITY_ORDER):
        if path.startswith(prefix):
            return i
    return len(_PRIORITY_ORDER)


def _get_role(path: str) -> str:
    parts = path.rstrip("/").split("/")
    category = parts[0] if parts[0] != "knowledge_base" else parts[1] if len(parts) > 1 else parts[0]
    return _CATEGORY_ROLES.get(category, "Reference")


def _fetch_memory_text(memory_store: "MemoryStore | None", data: dict) -> str | None:
    if memory_store is None:
        return None
    entries = memory_store.query(data)
    if not entries:
        return None
    text = memory_store.format_for_prompt(entries)
    logger.info("[prompt] Injected %d memory entries", len(entries))
    return text


def _fetch_learnings_text(
    learning_engine: "LearningEngine | None",
    skill_content: str,
    data: dict,
) -> str | None:
    if learning_engine is None:
        return None
    client_slug = data.get("client_slug")
    skill_name = None
    for line in skill_content.splitlines():
        if line.startswith("# "):
            skill_name = line[2:].strip().split("—")[0].strip().lower().replace(" ", "-")
            break
    text = learning_engine.format_for_prompt(client_slug=client_slug, skill=skill_name)
    if text:
        logger.info("[prompt] Injected learnings for client=%s skill=%s", client_slug, skill_name)
    return text or None


def _collect_context_entries(
    context_files: list[dict[str, str]],
    context_index: "ContextIndex | None",
    data: dict,
    skip_semantic: bool,
) -> list[dict[str, str]]:
    """Collect, deduplicate, sort, and role-annotate context files.

    Returns a list of dicts with keys: path, content, role.
    """
    seen_paths = {ctx["path"] for ctx in context_files}
    all_context = list(context_files)

    if context_index is not None and not skip_semantic:
        semantic_hits = context_index.search_by_data(data, top_k=3)
        for rel_path, score in semantic_hits:
            if rel_path in seen_paths:
                continue
            from app.core.skill_loader import load_file
            content = load_file(rel_path)
            if content:
                all_context.append({"path": rel_path, "content": content})
                seen_paths.add(rel_path)
                logger.info("[prompt] Semantic context: %s (score=%.3f)", rel_path, score)

    sorted_ctx = sorted(all_context, key=_context_priority)
    return [
        {"path": ctx["path"], "content": ctx["content"], "role": _get_role(ctx["path"])}
        for ctx in sorted_ctx
    ]


def _log_prompt_size(prompt: str, tag: str) -> None:
    char_count = len(prompt)
    token_est = char_count // 4
    if token_est > settings.prompt_size_warn_tokens:
        logger.warning(
            "[%s] Large prompt: chars=%d, tokens_est=%d (threshold=%d)",
            tag, char_count, token_est, settings.prompt_size_warn_tokens,
        )
    else:
        logger.info("[%s] chars=%d, tokens_est=%d", tag, char_count, token_est)


def build_prompt(
    skill_content: str,
    context_files: list[dict[str, str]],
    data: dict,
    instructions: str | None = None,
    memory_store: "MemoryStore | None" = None,
    context_index: "ContextIndex | None" = None,
    skip_semantic: bool = False,
    learning_engine: "LearningEngine | None" = None,
    output_format: str = "json",
) -> str:
    memory_text = _fetch_memory_text(memory_store, data)
    learnings_text = _fetch_learnings_text(learning_engine, skill_content, data)
    context_entries = _collect_context_entries(context_files, context_index, data, skip_semantic)

    template = _env.get_template("build_prompt.j2")
    prompt = template.render(
        output_format=output_format,
        skill_content=skill_content,
        memory_text=memory_text,
        learnings_text=learnings_text,
        context_entries=context_entries,
        data_json=json.dumps(data),
        instructions=instructions or None,
    )

    _log_prompt_size(prompt, "prompt")
    return prompt


async def build_prompt_rack(
    rack: "ContextRack",
    skill_name: str,
    skill_content: str,
    skill_config: dict,
    data: dict,
    *,
    instructions: str | None = None,
    output_format: str = "json",
    memory_store: "MemoryStore | None" = None,
    context_index: "ContextIndex | None" = None,
    learning_engine: "LearningEngine | None" = None,
    skip_semantic: bool = False,
    execution_id: str | None = None,
    model: str | None = None,
) -> str:
    """Build prompt using the Context Rack pipeline.

    Drop-in async replacement for build_prompt(). Callers switch between them
    based on the supabase_context_rack_enabled feature flag.
    """
    from app.core.context_rack import RackContext

    ctx = RackContext.from_request(
        skill_name=skill_name,
        skill_content=skill_content,
        skill_config=skill_config,
        data=data,
        instructions=instructions,
        output_format=output_format,
        memory_store=memory_store,
        context_index=context_index,
        learning_engine=learning_engine,
        skip_semantic=skip_semantic,
    )

    prompt, manifest = await rack.assemble(ctx)

    if settings.context_rack_log_loads:
        from app.core.context_analytics import log_context_load
        try:
            await log_context_load(
                ctx,
                manifest,
                execution_id=execution_id,
                model=model,
                source_mode=settings.supabase_context_source,
            )
        except Exception:
            pass  # Analytics should never block execution

    return prompt


def build_agent_prompts(
    skill_content: str,
    context_files: list[dict[str, str]],
    data: dict,
    instructions: str | None = None,
    memory_store: "MemoryStore | None" = None,
    context_index: "ContextIndex | None" = None,
    skip_semantic: bool = False,
    learning_engine: "LearningEngine | None" = None,
) -> str:
    """Build a prompt for agent-type skills (multi-turn with tool use)."""
    memory_text = _fetch_memory_text(memory_store, data)
    if memory_text:
        logger.info("[agent-prompt] Memory injected")
    learnings_text = _fetch_learnings_text(learning_engine, skill_content, data)
    context_entries = _collect_context_entries(context_files, context_index, data, skip_semantic)

    template = _env.get_template("build_agent_prompt.j2")
    prompt = template.render(
        skill_content=skill_content,
        memory_text=memory_text,
        learnings_text=learnings_text,
        context_entries=context_entries,
        data_json=json.dumps(data),
        instructions=instructions or None,
    )

    _log_prompt_size(prompt, "agent-prompt")
    return prompt
