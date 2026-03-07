# Context Assembly Improvements — Implementation Plan

## Goal
Make the context assembler smarter about **how** it injects context into prompts. The context files are already good — this is about ordering and framing them so the AI uses them more effectively.

## Two Changes (both in `app/core/context_assembler.py`)

---

### Change 1: Context Priority Ordering

**Problem:** All context files are dumped into the prompt in the order they're listed in skill.md. But LLMs pay more attention to context that appears closer to the data payload and final instruction. Right now, the client profile (most specific, most important) can end up buried above generic methodology files.

**Fix:** Sort loaded context files by specificity before assembling the prompt. Most generic first, most specific last (closest to the data).

**Priority tiers (lowest to highest):**
1. `knowledge_base/frameworks/*` — generic methodology (PVC, PAS, etc.)
2. `knowledge_base/voice/*` — writing style rules
3. `knowledge_base/sequences/*` — cadence patterns
4. `knowledge_base/objections/*`, `knowledge_base/competitive/*` — response patterns
5. `knowledge_base/signals/*` — signal intelligence
6. `knowledge_base/personas/*` — buyer archetypes
7. `knowledge_base/industries/*` — industry context (auto-loaded, data-specific)
8. `clients/*` — client profile (most specific, always last)

**Implementation:**
- Add a `_context_priority(path: str) -> int` function that returns a sort key based on the path prefix
- Sort `context_files` list by priority before the assembly loop
- ~10 lines of code

**File to modify:** `app/core/context_assembler.py`

**Current code (line 22-25):**
```python
if context_files:
    parts.append("\n\n---\n\n# Loaded Context\n")
    for ctx in context_files:
        parts.append(f"\n## {ctx['path']}\n\n{ctx['content']}")
```

**New code:**
```python
if context_files:
    sorted_ctx = sorted(context_files, key=lambda c: _context_priority(c["path"]))
    parts.append("\n\n---\n\n# Loaded Context\n")
    # ... manifest (see Change 2)
    for ctx in sorted_ctx:
        parts.append(f"\n## {ctx['path']}\n\n{ctx['content']}")
```

**Priority function:**
```python
_PRIORITY_ORDER = [
    "knowledge_base/frameworks/",
    "knowledge_base/voice/",
    "knowledge_base/sequences/",
    "knowledge_base/objections/",
    "knowledge_base/competitive/",
    "knowledge_base/signals/",
    "knowledge_base/personas/",
    "knowledge_base/industries/",
    "clients/",
]

def _context_priority(path: str) -> int:
    for i, prefix in enumerate(_PRIORITY_ORDER):
        if path.startswith(prefix):
            return i
    return len(_PRIORITY_ORDER)
```

---

### Change 2: Context Manifest

**Problem:** The AI receives context files with file paths as headers (`## knowledge_base/signals/signal-openers.md`) but has no guidance on what each file is for or how to prioritize them. It has to figure out relevance on its own.

**Fix:** Add a brief manifest block at the top of the `# Loaded Context` section that lists all loaded files with their role description. This gives the AI a map before it reads the full content.

**Implementation:**
- Map each context category to a short role description
- Generate a numbered list showing what's loaded and why
- Insert between the `# Loaded Context` header and the first file
- ~15 lines of code

**Role descriptions by category:**
```python
_CATEGORY_ROLES = {
    "frameworks": "structural email/content framework — follow this pattern",
    "voice": "voice and tone rules — always apply",
    "sequences": "multi-touch cadence patterns — use for sequence-aware messaging",
    "objections": "objection response patterns — reference when handling pushback",
    "competitive": "competitive positioning — use for differentiation without bashing",
    "signals": "signal intelligence — use when signal data is present in the row",
    "personas": "buyer archetype — adapt language and angles to this persona",
    "industries": "industry context — ground messaging in sector-specific knowledge",
    "clients": "client profile — primary context, most specific, highest priority",
}
```

**Manifest output example:**
```
# Loaded Context (5 files)

Context map (ordered by specificity, most important last):
1. knowledge_base/frameworks/josh-braun-pvc.md — structural email/content framework
2. knowledge_base/voice/writing-style.md — voice and tone rules
3. knowledge_base/signals/signal-openers.md — signal intelligence
4. knowledge_base/personas/vp-engineering.md — buyer archetype
5. clients/twelve-labs.md — client profile (highest priority)
```

**Code addition** (inside `build_prompt`, after sorting context):
```python
if context_files:
    sorted_ctx = sorted(context_files, key=lambda c: _context_priority(c["path"]))
    parts.append(f"\n\n---\n\n# Loaded Context ({len(sorted_ctx)} files)\n")

    # Manifest
    parts.append("\nContext map (ordered by specificity, most important last):")
    for i, ctx in enumerate(sorted_ctx, 1):
        role = _get_role(ctx["path"])
        parts.append(f"\n{i}. {ctx['path']} — {role}")
    parts.append("\n")

    # Full content
    for ctx in sorted_ctx:
        parts.append(f"\n## {ctx['path']}\n\n{ctx['content']}")
```

---

## Files to Modify

| File | What Changes |
|------|-------------|
| `app/core/context_assembler.py` | Add `_PRIORITY_ORDER`, `_CATEGORY_ROLES`, `_context_priority()`, `_get_role()`. Update `build_prompt()` to sort context and prepend manifest. |

No other files change. The skill loader, models, dashboard, and skill.md files are untouched.

## Verification

1. `POST /context/preview` with `email-gen`, `twelve-labs`, and sample data including `persona_slug: "vp-engineering"` — verify:
   - Context files are ordered: frameworks → voice → signals → personas → clients
   - Manifest appears at top of Loaded Context section
   - `clients/twelve-labs.md` is always last (closest to data payload)

2. Compare output quality: run the same `email-gen` call before and after — the output should show better use of client-specific context (value props, campaign angles) because it's positioned closest to the data.

## What NOT to Change
- `skill_loader.py` — context refs in skill.md stay as-is, ordering is handled at assembly time
- `context_store.py` — no changes needed
- Any skill.md files — no changes needed
- Client profiles — no changes needed
