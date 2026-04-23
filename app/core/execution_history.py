"""Execution history store — persists function execution records for replay.

Storage: data/function-executions/{function_id}/{exec_id}.json
Pattern: Same as memory_store — directory-based JSON, atomic writes.
"""

import json
import logging
import uuid
from pathlib import Path

from app.core.atomic_writer import atomic_write_json

logger = logging.getLogger("clay-webhook-os")

MAX_PER_FUNCTION = 20


class ExecutionHistory:
    """Lightweight JSON store for function execution records."""

    def __init__(self, data_dir: str | Path = "data"):
        self._base_dir = Path(data_dir) / "function-executions"
        self._base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, record: dict) -> str:
        """Save an execution record. Returns the record ID."""
        exec_id = record.get("id") or f"exec_{uuid.uuid4().hex[:12]}"
        record["id"] = exec_id
        func_id = record.get("function_id", "unknown")
        func_dir = self._base_dir / func_id
        func_dir.mkdir(parents=True, exist_ok=True)

        path = func_dir / f"{exec_id}.json"
        try:
            atomic_write_json(path, record)
            self._prune(func_dir)
            logger.info("[execution_history] Saved %s for function %s", exec_id, func_id)
        except Exception as e:
            logger.warning("[execution_history] Failed to save %s: %s", exec_id, e)
        return exec_id

    def update(self, function_id: str, exec_id: str, updates: dict) -> dict | None:
        """Update fields on an existing execution record. Returns updated record or None."""
        path = self._base_dir / function_id / f"{exec_id}.json"
        if not path.exists():
            return None
        try:
            record = json.loads(path.read_text())
            record.update(updates)
            atomic_write_json(path, record)
            return record
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("[execution_history] Failed to update %s: %s", exec_id, e)
            return None

    def list(self, function_id: str, limit: int = 20) -> list[dict]:
        """List recent executions for a function, sorted by mtime desc."""
        func_dir = self._base_dir / function_id
        if not func_dir.exists():
            return []

        files = sorted(func_dir.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True)
        results = []
        for f in files[:limit]:
            try:
                data = json.loads(f.read_text())
                results.append(data)
            except (json.JSONDecodeError, OSError) as e:
                logger.warning("[execution_history] Skipping corrupt file %s: %s", f, e)
        return results

    def get(self, function_id: str, exec_id: str) -> dict | None:
        """Get a single execution record."""
        path = self._base_dir / function_id / f"{exec_id}.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("[execution_history] Failed to read %s: %s", path, e)
            return None

    def _prune(self, func_dir: Path) -> None:
        """Delete oldest records beyond MAX_PER_FUNCTION."""
        files = sorted(func_dir.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True)
        for f in files[MAX_PER_FUNCTION:]:
            try:
                f.unlink()
                logger.info("[execution_history] Pruned old record %s", f.name)
            except OSError:
                pass
