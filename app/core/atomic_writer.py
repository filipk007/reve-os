"""Atomic file writes — prevents data corruption from crashes mid-write.

Usage:
    from app.core.atomic_writer import atomic_write_text, atomic_write_json

    atomic_write_text(path, content)          # plain text
    atomic_write_json(path, data, indent=2)   # JSON serialization

Both write to a `.tmp` sibling first, then atomically replace via os.replace().
"""

import json
import os
from pathlib import Path


def atomic_write_text(path: Path, content: str) -> None:
    """Write text to a file atomically.

    Writes to a temporary file in the same directory, then replaces the target.
    This is atomic on POSIX systems (same filesystem).
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        tmp.write_text(content)
        os.replace(tmp, path)
    except BaseException:
        # Clean up temp file on any failure
        tmp.unlink(missing_ok=True)
        raise


def atomic_write_json(path: Path, data: object, *, indent: int = 2) -> None:
    """Serialize data as JSON and write atomically."""
    content = json.dumps(data, indent=indent)
    atomic_write_text(path, content)
