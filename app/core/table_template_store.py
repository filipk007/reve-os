"""Table template store — loads pre-wired table templates from YAML.

Templates are checked-in recipes that combine columns + context + instructions.
Claude Code (or any caller) can instantiate a template into a live table with
optional variable substitution, skipping the tedious column-by-column setup.
"""

import logging
import re
from pathlib import Path
from typing import Any

import yaml

from app.models.tables import TableTemplate, TableTemplateColumn, TableTemplateVariable

logger = logging.getLogger("clay-webhook-os")

_VAR_RE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")


def _substitute(value: Any, variables: dict[str, str]) -> Any:
    """Recursively substitute {{var}} references in strings, lists, and dicts."""
    if isinstance(value, str):
        def repl(match: re.Match) -> str:
            key = match.group(1)
            return variables.get(key, match.group(0))
        return _VAR_RE.sub(repl, value)
    if isinstance(value, list):
        return [_substitute(v, variables) for v in value]
    if isinstance(value, dict):
        return {k: _substitute(v, variables) for k, v in value.items()}
    return value


class TableTemplateStore:
    def __init__(self, templates_dir: Path):
        self._dir = templates_dir
        self._templates: dict[str, TableTemplate] = {}

    def load(self) -> None:
        if not self._dir.exists():
            self._dir.mkdir(parents=True, exist_ok=True)
            logger.info("[table_templates] Created empty templates dir at %s", self._dir)
            return

        for f in sorted(self._dir.glob("*.yaml")):
            try:
                raw = yaml.safe_load(f.read_text())
                if not raw:
                    continue
                template_id = raw.get("id") or f.stem
                columns = [TableTemplateColumn(**c) for c in raw.get("columns", [])]
                variables = [TableTemplateVariable(**v) for v in raw.get("variables", [])]
                template = TableTemplate(
                    id=template_id,
                    name=raw.get("name", template_id),
                    description=raw.get("description", ""),
                    category=raw.get("category", "general"),
                    client_slug=raw.get("client_slug"),
                    context_files=raw.get("context_files", []) or [],
                    context_instructions=raw.get("context_instructions"),
                    variables=variables,
                    columns=columns,
                )
                self._templates[template_id] = template
            except Exception as e:
                logger.warning("[table_templates] Failed to load %s: %s", f.name, e)

        logger.info("[table_templates] Loaded %d templates", len(self._templates))

    def list_all(self) -> list[TableTemplate]:
        return list(self._templates.values())

    def get(self, template_id: str) -> TableTemplate | None:
        return self._templates.get(template_id)

    def instantiate(
        self,
        template_id: str,
        variables: dict[str, str] | None = None,
    ) -> TableTemplate | None:
        """Return a resolved copy of the template with variables substituted.

        Raises ValueError if required variables are missing.
        """
        template = self._templates.get(template_id)
        if template is None:
            return None

        variables = variables or {}

        # Apply defaults for unset variables
        for var in template.variables:
            if var.name not in variables and var.default is not None:
                variables[var.name] = var.default

        # Check required
        missing = [
            v.name for v in template.variables
            if v.required and v.name not in variables
        ]
        if missing:
            raise ValueError(f"Missing required variables: {', '.join(missing)}")

        # Deep substitute over the model dict, then rebuild
        raw = template.model_dump()
        resolved_raw = _substitute(raw, variables)
        return TableTemplate(**resolved_raw)
