"""Migrate knowledge_base/ and clients/ files into Supabase context_items table.

This script reads every markdown file from the knowledge base and client
directories, parses their YAML frontmatter, extracts category and priority
from the file path, and inserts them into the context_items table.

It also:
    - Maps SKILL_CLIENT_SECTIONS from context_filter.py to applicable_skills arrays
    - Maps _PRIORITY_ORDER from context_assembler.py to priority_weight values
    - Creates version 1 entries in context_versions for audit trail
    - Is idempotent: uses source_path as dedup key (upsert on conflict)

Usage:
    source .venv/bin/activate
    python scripts/migrate_context_to_supabase.py

    # Dry run (no writes, just shows what would be migrated):
    python scripts/migrate_context_to_supabase.py --dry-run
"""

import datetime
import hashlib
import json
import sys
from pathlib import Path

# Add project root to path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import yaml

from app.config import settings


class _DateEncoder(json.JSONEncoder):
    """Handle date/datetime from YAML frontmatter."""
    def default(self, obj):
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()
        return super().default(obj)


# ── Priority weights (maps file path prefix → priority_weight column) ────────
# Lower weight = loads earlier (generic). Higher = loads later (specific).
# Must match the ordering in context_assembler.py _PRIORITY_ORDER.

PATH_TO_PRIORITY: dict[str, int] = {
    "knowledge_base/_defaults/": 5,
    "knowledge_base/frameworks/": 10,
    "knowledge_base/voice/": 20,
    "knowledge_base/objections/": 30,
    "knowledge_base/competitive/": 40,
    "knowledge_base/sequences/": 50,
    "knowledge_base/signals/": 60,
    "knowledge_base/personas/": 70,
    "knowledge_base/industries/": 80,
    "knowledge_base/enrichment/": 85,
    "clients/": 90,
}

# ── Category extraction from path ────────────────────────────────────────────

def _extract_category(rel_path: str) -> str:
    """Extract category from a relative file path.

    knowledge_base/frameworks/pvc.md → "frameworks"
    knowledge_base/_defaults/writing.md → "_defaults"
    clients/twelve-labs/profile.md → "clients"
    clients/hologram.md → "clients"
    """
    parts = rel_path.split("/")
    if parts[0] == "knowledge_base" and len(parts) > 1:
        return parts[1]
    return parts[0]


def _extract_slug(rel_path: str) -> str:
    """Extract slug from a relative file path.

    knowledge_base/frameworks/josh-braun-pvc.md → "josh-braun-pvc"
    clients/twelve-labs/profile.md → "twelve-labs"
    clients/hologram.md → "hologram"
    """
    parts = rel_path.split("/")
    filename = parts[-1].replace(".md", "")
    # For structured client dirs (clients/slug/profile.md), use the dir name
    if parts[0] == "clients" and len(parts) > 2 and filename == "profile":
        return parts[1]
    # For nested client files (clients/slug/sops/foo.md), include subdir
    if parts[0] == "clients" and len(parts) > 3:
        return f"{parts[1]}-{'-'.join(parts[2:-1])}-{filename}"
    if parts[0] == "clients" and len(parts) > 2:
        return f"{parts[1]}-{filename}"
    # For flat client files (clients/hologram.md), use filename
    if parts[0] == "clients":
        return filename
    return filename


def _extract_item_type(rel_path: str) -> str:
    """Determine item_type from path.

    _defaults/ → 'default'
    clients/ → 'client_profile'
    learnings/ → 'learning'
    everything else → 'knowledge_base'
    """
    if "_defaults/" in rel_path:
        return "default"
    if rel_path.startswith("clients/"):
        return "client_profile"
    if "learnings/" in rel_path:
        return "learning"
    return "knowledge_base"


def _get_priority(rel_path: str) -> int:
    """Map file path to priority weight."""
    for prefix, weight in PATH_TO_PRIORITY.items():
        if rel_path.startswith(prefix):
            return weight
    return 50  # Default middle priority


def _extract_title(content: str, slug: str) -> str:
    """Extract H1 title from markdown content, or fall back to slug."""
    for line in content.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return slug.replace("-", " ").title()


def _parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter. Returns (metadata_dict, body_without_frontmatter)."""
    if not content.startswith("---"):
        return {}, content
    end = content.find("---", 3)
    if end == -1:
        return {}, content
    fm_text = content[3:end].strip()
    body = content[end + 3:].lstrip("\n")
    try:
        fm = yaml.safe_load(fm_text) or {}
    except yaml.YAMLError:
        return {}, content
    return fm, body


def _find_applicable_skills(rel_path: str) -> list[str]:
    """Determine which skills can use this context item.

    For client profiles: look up SKILL_CLIENT_SECTIONS to find which skills
    reference client profiles. Since ALL skills that have an entry in
    SKILL_CLIENT_SECTIONS load client profiles, client profiles are
    applicable to all those skills.

    For knowledge base files: check which skills reference this file in their
    frontmatter. This is harder to compute statically, so we default to
    empty (available to all) — the skill's frontmatter `context:` list
    handles the filtering at load time.

    Returns empty list = available to all skills.
    """
    # Client profiles are loaded by any skill with a SKILL_CLIENT_SECTIONS entry
    # But we don't restrict them — the filtering happens at section level
    # So we return empty (available to all)
    return []


# ── Main migration ───────────────────────────────────────────────────────────


def collect_files() -> list[dict]:
    """Scan knowledge_base/ and clients/ for markdown files.

    Returns a list of dicts ready for Supabase insertion.
    """
    items = []
    base = settings.base_dir

    # ── Knowledge base files ──
    kb_dir = base / "knowledge_base"
    if kb_dir.exists():
        for md_file in sorted(kb_dir.rglob("*.md")):
            # Skip archived files
            if "_archived" in str(md_file):
                continue

            rel_path = str(md_file.relative_to(base))
            raw_content = md_file.read_text()
            metadata, body = _parse_frontmatter(raw_content)

            slug = _extract_slug(rel_path)
            category = _extract_category(rel_path)
            item_type = _extract_item_type(rel_path)
            title = _extract_title(body, slug)
            priority = _get_priority(rel_path)
            content_hash = hashlib.sha256(body.encode()).hexdigest()

            items.append({
                "slug": slug,
                "category": category,
                "item_type": item_type,
                "title": title,
                "content": body,
                "content_hash": content_hash,
                "metadata": json.loads(json.dumps(metadata, cls=_DateEncoder)),
                "applicable_skills": _find_applicable_skills(rel_path),
                "applicable_clients": [],
                "applicable_signals": [],
                "applicable_industries": [],
                "applicable_personas": [],
                "priority_weight": priority,
                "is_default": item_type == "default",
                "is_active": True,
                "source_path": rel_path,
                "version": 1,
            })

    # ── Client profiles ──
    clients_dir = base / "clients"
    if clients_dir.exists():
        for md_file in sorted(clients_dir.rglob("*.md")):
            # Skip templates
            if "_template" in str(md_file) or "_templates" in str(md_file):
                continue

            rel_path = str(md_file.relative_to(base))
            raw_content = md_file.read_text()
            metadata, body = _parse_frontmatter(raw_content)

            slug = _extract_slug(rel_path)
            category = "clients"
            title = _extract_title(body if body else raw_content, slug)
            priority = _get_priority(rel_path)
            content_hash = hashlib.sha256((body or raw_content).encode()).hexdigest()

            items.append({
                "slug": slug,
                "category": category,
                "item_type": "client_profile",
                "title": title,
                "content": body if body else raw_content,
                "content_hash": content_hash,
                "metadata": json.loads(json.dumps(metadata, cls=_DateEncoder)),
                "applicable_skills": [],
                "applicable_clients": [slug],  # Client profiles are scoped to their own client
                "applicable_signals": [],
                "applicable_industries": [],
                "applicable_personas": [],
                "priority_weight": priority,
                "is_default": False,
                "is_active": True,
                "source_path": rel_path,
                "version": 1,
            })

    return items


def migrate(dry_run: bool = False) -> None:
    """Run the migration."""
    items = collect_files()

    print(f"\n{'=' * 60}")
    print(f"Context Rack Migration — {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"{'=' * 60}")
    print(f"\nFound {len(items)} files to migrate:\n")

    # Summary by category
    by_category: dict[str, int] = {}
    for item in items:
        by_category[item["category"]] = by_category.get(item["category"], 0) + 1

    for cat, count in sorted(by_category.items()):
        print(f"  {cat}: {count} files")

    print()

    if dry_run:
        print("Dry run — showing what would be inserted:\n")
        for item in items:
            print(f"  [{item['item_type']:15}] {item['source_path']}")
            print(f"    → slug={item['slug']}, category={item['category']}, "
                  f"priority={item['priority_weight']}, is_default={item['is_default']}")
        print(f"\nTotal: {len(items)} items would be inserted.")
        return

    # ── Live migration ──
    from app.core.supabase_client import get_client
    sb = get_client()
    if sb is None:
        print("ERROR: Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
        sys.exit(1)

    inserted = 0
    skipped = 0
    errors = 0

    for item in items:
        try:
            # Check if already migrated (idempotent)
            existing = (
                sb.table("context_items")
                .select("id")
                .eq("source_path", item["source_path"])
                .eq("is_active", True)
                .execute()
            )

            if existing.data:
                print(f"  SKIP  {item['source_path']} (already exists)")
                skipped += 1
                continue

            # Insert context item
            result = sb.table("context_items").insert(item).execute()
            item_id = result.data[0]["id"]

            # Create version 1 in audit trail
            sb.table("context_versions").insert({
                "context_item_id": item_id,
                "version": 1,
                "content": item["content"],
                "content_hash": item["content_hash"],
                "metadata": item["metadata"],
                "change_summary": "Initial migration from file system",
            }).execute()

            print(f"  OK    {item['source_path']}")
            inserted += 1

        except Exception as e:
            print(f"  ERROR {item['source_path']}: {e}")
            errors += 1

    print(f"\n{'=' * 60}")
    print(f"Migration complete: {inserted} inserted, {skipped} skipped, {errors} errors")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    migrate(dry_run=dry_run)
