import logging
import re
import shutil
from pathlib import Path

from app.core.atomic_writer import atomic_write_text
from app.core.context_assembler import build_prompt
from app.core.skill_loader import list_skills, load_context_files, load_skill, load_skill_config, parse_context_refs
from app.models.context import (
    ClientProfile,
    ClientSummary,
    CreateClientRequest,
    KnowledgeBaseFile,
    PromptPreviewResponse,
    UpdateClientRequest,
)

logger = logging.getLogger("clay-webhook-os")


class ContextStore:
    def __init__(
        self,
        clients_dir: Path,
        knowledge_dir: Path,
        skills_dir: Path,
    ):
        self._clients_dir = clients_dir
        self._knowledge_dir = knowledge_dir
        self._skills_dir = skills_dir

    # ── Client CRUD ──────────────────────────────────────────────

    def list_clients(self) -> list[ClientSummary]:
        if not self._clients_dir.exists():
            return []
        results = []
        for d in sorted(self._clients_dir.iterdir()):
            if d.name.startswith("_"):
                continue
            # Support both structured dirs and flat files
            if d.is_dir():
                profile_file = d / "profile.md"
                if not profile_file.exists():
                    continue
                slug = d.name
                content = profile_file.read_text()
            elif d.suffix == ".md":
                slug = d.stem
                content = d.read_text()
            else:
                continue
            profile = self._parse_client_markdown(slug, content)
            results.append(
                ClientSummary(slug=profile.slug, name=profile.name)
            )
        return results

    def get_client(self, slug: str) -> ClientProfile | None:
        # Try structured directory first, then flat file
        profile_file = self._clients_dir / slug / "profile.md"
        if profile_file.exists():
            content = profile_file.read_text()
            return self._parse_client_markdown(slug, content)
        flat_file = self._clients_dir / f"{slug}.md"
        if flat_file.exists():
            content = flat_file.read_text()
            return self._parse_client_markdown(slug, content)
        return None

    def create_client(self, data: CreateClientRequest) -> ClientProfile:
        profile = ClientProfile(
            slug=data.slug,
            name=data.name,
            who_they_are=data.who_they_are,
            what_they_sell=data.what_they_sell,
            value_proposition=data.value_proposition,
            tone_preferences=data.tone_preferences,
            social_proof=data.social_proof,
            market_feedback=data.market_feedback,
            target_icp=data.target_icp,
            competitive_landscape=data.competitive_landscape,
        )
        md = self._render_client_markdown(profile)
        profile.raw_markdown = md
        client_dir = self._clients_dir / data.slug
        client_dir.mkdir(parents=True, exist_ok=True)
        atomic_write_text(client_dir / "profile.md", md)
        logger.info("[context] Created client: %s", data.slug)
        return profile

    def update_client(self, slug: str, data: UpdateClientRequest) -> ClientProfile | None:
        existing = self.get_client(slug)
        if existing is None:
            return None
        updates = data.model_dump(exclude_none=True)
        updated = existing.model_copy(update=updates)
        md = self._render_client_markdown(updated)
        updated.raw_markdown = md
        client_dir = self._clients_dir / slug
        client_dir.mkdir(parents=True, exist_ok=True)
        atomic_write_text(client_dir / "profile.md", md)
        logger.info("[context] Updated client: %s", slug)
        return updated

    def delete_client(self, slug: str) -> bool:
        # Try structured directory first
        client_dir = self._clients_dir / slug
        if client_dir.is_dir():
            shutil.rmtree(client_dir)
            logger.info("[context] Deleted client: %s", slug)
            return True
        # Fall back to flat file
        flat_file = self._clients_dir / f"{slug}.md"
        if flat_file.exists():
            flat_file.unlink()
            logger.info("[context] Deleted client: %s", slug)
            return True
        return False

    # ── Knowledge Base ───────────────────────────────────────────

    def list_knowledge_base(self) -> list[KnowledgeBaseFile]:
        if not self._knowledge_dir.exists():
            return []
        results = []
        for f in sorted(self._knowledge_dir.rglob("*.md")):
            rel = f.relative_to(self._knowledge_dir)
            parts = rel.parts
            category = parts[0] if len(parts) > 1 else "general"
            results.append(
                KnowledgeBaseFile(
                    path=str(rel),
                    category=category,
                    name=f.stem,
                    content=f.read_text(),
                )
            )
        return results

    def get_knowledge_file(self, category: str, filename: str) -> KnowledgeBaseFile | None:
        f = self._knowledge_dir / category / filename
        if not f.exists():
            return None
        return KnowledgeBaseFile(
            path=f"{category}/{filename}",
            category=category,
            name=f.stem,
            content=f.read_text(),
        )

    def update_knowledge_file(
        self, category: str, filename: str, content: str
    ) -> KnowledgeBaseFile | None:
        f = self._knowledge_dir / category / filename
        if not f.exists():
            return None
        atomic_write_text(f, content)
        logger.info("[context] Updated KB file: %s/%s", category, filename)
        return KnowledgeBaseFile(
            path=f"{category}/{filename}",
            category=category,
            name=f.stem,
            content=content,
        )

    def create_knowledge_file(
        self, category: str, filename: str, content: str
    ) -> KnowledgeBaseFile:
        # Sanitize inputs
        if ".." in category or ".." in filename:
            raise ValueError("Invalid path component")
        for ch in ("/", "\\"):
            if ch in category or ch in filename:
                raise ValueError("Invalid path component")

        # Slugify category
        category = re.sub(r"[^a-z0-9]+", "-", category.lower()).strip("-")

        # Ensure .md extension
        if not filename.endswith(".md"):
            filename = filename + ".md"

        path = self._knowledge_dir / category / filename
        if path.exists():
            raise ValueError("File already exists")

        path.parent.mkdir(parents=True, exist_ok=True)
        atomic_write_text(path, content)
        logger.info("[context] Created KB file: %s/%s", category, filename)
        return KnowledgeBaseFile(
            path=f"{category}/{filename}",
            category=category,
            name=path.stem,
            content=content,
        )

    def delete_knowledge_file(self, category: str, filename: str) -> bool:
        # Sanitize inputs
        if ".." in category or ".." in filename:
            raise ValueError("Invalid path component")
        for ch in ("/", "\\"):
            if ch in category or ch in filename:
                raise ValueError("Invalid path component")

        path = self._knowledge_dir / category / filename
        if not path.exists():
            return False

        path.unlink()
        logger.info("[context] Deleted KB file: %s/%s", category, filename)

        # Remove empty category directory
        cat_dir = self._knowledge_dir / category
        if cat_dir.exists() and not any(cat_dir.iterdir()):
            cat_dir.rmdir()

        return True

    def list_categories(self) -> list[str]:
        if not self._knowledge_dir.exists():
            return []
        return sorted(
            d.name for d in self._knowledge_dir.iterdir() if d.is_dir()
        )

    def get_context_usage_map(self) -> dict[str, list[str]]:
        usage: dict[str, list[str]] = {}
        all_skills = list_skills()
        for skill_name in all_skills:
            config = load_skill_config(skill_name)
            refs = config.get("context", []) or []
            if not refs:
                content = load_skill(skill_name)
                if content:
                    refs = parse_context_refs(content)
            for ref in refs:
                usage.setdefault(ref, []).append(skill_name)

        # Add _defaults/ files as used by all skills
        defaults_dir = self._knowledge_dir / "_defaults"
        if defaults_dir.exists():
            for f in sorted(defaults_dir.iterdir()):
                if f.suffix == ".md":
                    rel = f"knowledge_base/_defaults/{f.name}"
                    usage[rel] = list(all_skills)

        return usage

    # ── Prompt Preview ───────────────────────────────────────────

    def preview_prompt(
        self, skill: str, client_slug: str, sample_data: dict | None = None
    ) -> PromptPreviewResponse | None:
        skill_content = load_skill(skill)
        if skill_content is None:
            return None
        data = {**(sample_data or {}), "client_slug": client_slug}
        context_files = load_context_files(skill_content, data, skill_name=skill)
        prompt = build_prompt(skill_content, context_files, data)
        return PromptPreviewResponse(
            assembled_prompt=prompt,
            context_files_loaded=[f["path"] for f in context_files],
            estimated_tokens=len(prompt) // 4,
        )

    # ── Internal: Markdown parsing ───────────────────────────────

    def _parse_client_markdown(self, slug: str, content: str) -> ClientProfile:
        """Parse a v2 client profile into structured fields.

        v2 sections (all optional, stripped of leading/trailing whitespace):
        Who They Are, What They Sell, Value Proposition, Tone Preferences,
        Social Proof, Market Feedback, Target ICP, Competitive Landscape.

        Unknown sections are preserved in raw_markdown for round-trip safety.
        """
        sections = self._split_sections(content)

        # Extract name from H1 or first line
        name = slug.replace("-", " ").title()
        h1_match = re.match(r"^#\s+(.+)", content)
        if h1_match:
            name = h1_match.group(1).strip()

        return ClientProfile(
            slug=slug,
            name=name,
            who_they_are=sections.get("Who They Are", "").strip(),
            what_they_sell=sections.get("What They Sell", "").strip(),
            value_proposition=sections.get("Value Proposition", "").strip(),
            tone_preferences=sections.get("Tone Preferences", "").strip(),
            social_proof=sections.get("Social Proof", "").strip(),
            market_feedback=sections.get("Market Feedback", "").strip(),
            target_icp=sections.get("Target ICP", "").strip(),
            competitive_landscape=sections.get("Competitive Landscape", "").strip(),
            raw_markdown=content,
        )

    def _split_sections(self, content: str) -> dict[str, str]:
        sections: dict[str, str] = {}
        current_key: str | None = None
        current_lines: list[str] = []

        for line in content.split("\n"):
            if line.startswith("## "):
                if current_key is not None:
                    sections[current_key] = "\n".join(current_lines)
                current_key = line[3:].strip()
                current_lines = []
            elif current_key is not None:
                current_lines.append(line)

        if current_key is not None:
            sections[current_key] = "\n".join(current_lines)

        return sections

    def _render_client_markdown(self, profile: ClientProfile) -> str:
        """Render a v2 client profile back out to markdown.

        Section order matches the v2 template. Empty sections are omitted
        (except the H1 title). Any content not recognized by the parser
        is lost on round-trip — callers should fetch raw_markdown if they
        need to preserve out-of-schema content.
        """
        lines: list[str] = []
        lines.append(f"# {profile.name}")
        lines.append("")

        # Order must match v2 template:
        # Who They Are → What They Sell → Value Proposition → Tone Preferences
        # → Social Proof → Market Feedback → Target ICP → Competitive Landscape
        v2_sections: list[tuple[str, str]] = [
            ("Who They Are", profile.who_they_are),
            ("What They Sell", profile.what_they_sell),
            ("Value Proposition", profile.value_proposition),
            ("Tone Preferences", profile.tone_preferences),
            ("Social Proof", profile.social_proof),
            ("Market Feedback", profile.market_feedback),
            ("Target ICP", profile.target_icp),
            ("Competitive Landscape", profile.competitive_landscape),
        ]
        for heading, body in v2_sections:
            if not body.strip():
                continue
            lines.append(f"## {heading}")
            lines.append("")
            lines.append(body.rstrip())
            lines.append("")

        return "\n".join(lines)
