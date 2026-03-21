"""File-based chat session persistence.

Storage layout:
    data/channels/{session_id}.json -- One JSON file per session

Each session file contains the full ChannelSession model (including messages).
All writes use atomic_write_json to prevent corruption from crashes mid-write.
"""

import json
import logging
import time
import uuid
from pathlib import Path

from app.core.atomic_writer import atomic_write_json
from app.models.channels import ChannelMessage, ChannelSession, SessionSummary

logger = logging.getLogger("clay-webhook-os")


class ChannelStore:
    """File-based chat session persistence.

    Storage layout:
        data/channels/{session_id}.json -- One JSON file per session
    """

    def __init__(self, data_dir: Path):
        self._dir = data_dir / "channels"

    def load(self) -> None:
        """Initialize storage directory and log existing session count."""
        self._dir.mkdir(parents=True, exist_ok=True)
        count = sum(1 for f in self._dir.glob("*.json"))
        logger.info("[channels] Loaded %d sessions", count)

    def create_session(self, function_id: str, title: str = "") -> ChannelSession:
        """Create a new chat session and persist it to disk."""
        session_id = uuid.uuid4().hex[:12]
        now = time.time()
        session = ChannelSession(
            id=session_id,
            function_id=function_id,
            title=title or f"Session {session_id[:6]}",
            messages=[],
            created_at=now,
            updated_at=now,
            status="active",
        )
        atomic_write_json(self._dir / f"{session_id}.json", session.model_dump())
        return session

    def get_session(self, session_id: str) -> ChannelSession | None:
        """Retrieve a session by ID. Returns None if not found."""
        path = self._dir / f"{session_id}.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text())
        return ChannelSession(**data)

    def add_message(self, session_id: str, message: dict) -> ChannelMessage | None:
        """Append a message to a session. Returns None if session not found."""
        session = self.get_session(session_id)
        if session is None:
            return None
        msg = ChannelMessage(**message)
        session.messages.append(msg)
        session.updated_at = time.time()
        atomic_write_json(self._dir / f"{session_id}.json", session.model_dump())
        return msg

    def list_sessions(self) -> list[SessionSummary]:
        """List all sessions as summaries, sorted by updated_at descending."""
        sessions: list[SessionSummary] = []
        for f in self._dir.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                sessions.append(SessionSummary(
                    id=data["id"],
                    function_id=data["function_id"],
                    title=data.get("title", ""),
                    message_count=len(data.get("messages", [])),
                    created_at=data["created_at"],
                    updated_at=data["updated_at"],
                    status=data.get("status", "active"),
                ))
            except (json.JSONDecodeError, KeyError):
                continue
        return sorted(sessions, key=lambda s: s.updated_at, reverse=True)

    def archive_session(self, session_id: str) -> ChannelSession | None:
        """Mark a session as archived. Returns None if not found."""
        session = self.get_session(session_id)
        if session is None:
            return None
        session.status = "archived"
        session.updated_at = time.time()
        atomic_write_json(self._dir / f"{session_id}.json", session.model_dump())
        return session

    def update_message_results(self, session_id: str, message_index: int, results: list[dict]) -> bool:
        """Update a specific message's results field (for saving after SSE completes)."""
        session = self.get_session(session_id)
        if session is None or message_index >= len(session.messages):
            return False
        session.messages[message_index].results = results
        session.updated_at = time.time()
        atomic_write_json(self._dir / f"{session_id}.json", session.model_dump())
        return True
