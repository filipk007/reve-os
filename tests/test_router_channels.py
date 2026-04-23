"""Tests for app/routers/channels.py — chat session endpoints + SSE streaming."""

from unittest.mock import MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.channels import (
    ChannelMessage,
    ChannelSession,
    SessionSummary,
)
from app.routers.channels import router


def _mock_session(**kwargs) -> ChannelSession:
    defaults = dict(
        id="abc123def456",
        function_id="my-func",
        title="Session abc123",
        messages=[],
        created_at=1700000000.0,
        updated_at=1700000000.0,
        status="active",
    )
    defaults.update(kwargs)
    return ChannelSession(**defaults)


def _mock_summary(**kwargs) -> SessionSummary:
    defaults = dict(
        id="abc123def456",
        function_id="my-func",
        title="Session abc123",
        message_count=0,
        created_at=1700000000.0,
        updated_at=1700000000.0,
        status="active",
    )
    defaults.update(kwargs)
    return SessionSummary(**defaults)


def _make_app(**state_overrides) -> FastAPI:
    app = FastAPI()
    app.include_router(router)

    store = MagicMock()
    store.create_session.return_value = _mock_session()
    store.get_session.return_value = None
    store.list_sessions.return_value = []
    store.archive_session.return_value = None
    store.add_message.return_value = ChannelMessage(
        role="user", content="test", timestamp=1700000000.0
    )
    store.update_message_results.return_value = True

    orchestrator = MagicMock()

    app.state.channel_store = store
    app.state.channel_orchestrator = orchestrator

    for key, value in state_overrides.items():
        setattr(app.state, key, value)

    return app


# ---------------------------------------------------------------------------
# POST /channels — Create session
# ---------------------------------------------------------------------------


class TestCreateSession:
    def test_create_session(self):
        app = _make_app()
        client = TestClient(app)
        resp = client.post("/channels", json={"function_id": "my-func"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == "abc123def456"
        assert body["function_id"] == "my-func"
        assert body["status"] == "active"
        assert "created_at" in body

    def test_create_session_validation_empty_function_id(self):
        app = _make_app()
        client = TestClient(app)
        resp = client.post("/channels", json={"function_id": ""})
        assert resp.status_code == 422

    def test_create_session_validation_whitespace_function_id(self):
        app = _make_app()
        client = TestClient(app)
        resp = client.post("/channels", json={"function_id": "   "})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /channels — List sessions
# ---------------------------------------------------------------------------


class TestListSessions:
    def test_empty(self):
        app = _make_app()
        client = TestClient(app)
        resp = client.get("/channels")
        assert resp.status_code == 200
        body = resp.json()
        assert body["sessions"] == []

    def test_with_sessions(self):
        store = MagicMock()
        store.list_sessions.return_value = [
            _mock_summary(id="s1", updated_at=1700000002.0),
            _mock_summary(id="s2", updated_at=1700000001.0),
        ]
        app = _make_app(channel_store=store)
        client = TestClient(app)
        resp = client.get("/channels")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["sessions"]) == 2
        assert body["sessions"][0]["id"] == "s1"


# ---------------------------------------------------------------------------
# GET /channels/{session_id} — Get session
# ---------------------------------------------------------------------------


class TestGetSession:
    def test_get_session(self):
        store = MagicMock()
        store.get_session.return_value = _mock_session(id="sess1")
        app = _make_app(channel_store=store)
        client = TestClient(app)
        resp = client.get("/channels/sess1")
        assert resp.status_code == 200
        assert resp.json()["id"] == "sess1"

    def test_get_session_not_found(self):
        app = _make_app()
        client = TestClient(app)
        resp = client.get("/channels/nonexistent")
        assert resp.status_code == 404
        body = resp.json()
        assert body["error"] is True
        assert "not found" in body["error_message"].lower()


# ---------------------------------------------------------------------------
# DELETE /channels/{session_id} — Archive session
# ---------------------------------------------------------------------------


class TestArchiveSession:
    def test_archive_session(self):
        store = MagicMock()
        store.archive_session.return_value = _mock_session(
            id="sess1", status="archived"
        )
        app = _make_app(channel_store=store)
        client = TestClient(app)
        resp = client.delete("/channels/sess1")
        assert resp.status_code == 200
        assert resp.json()["status"] == "archived"

    def test_archive_session_not_found(self):
        app = _make_app()
        client = TestClient(app)
        resp = client.delete("/channels/nonexistent")
        assert resp.status_code == 404
        body = resp.json()
        assert body["error"] is True


# ---------------------------------------------------------------------------
# POST /channels/{session_id}/messages — Send message (SSE)
# ---------------------------------------------------------------------------


class TestSendMessage:
    def test_send_message_not_found(self):
        app = _make_app()
        client = TestClient(app)
        resp = client.post(
            "/channels/nonexistent/messages",
            json={"data": [{"domain": "acme.com"}]},
        )
        assert resp.status_code == 404
        body = resp.json()
        assert body["error"] is True

    def test_send_message_sse_stream(self):
        """SSE stream returns correct content type and event-formatted data."""
        store = MagicMock()
        session = _mock_session(id="sess1")
        store.get_session.return_value = session
        store.add_message.return_value = ChannelMessage(
            role="user", content="test", timestamp=1700000000.0
        )
        store.update_message_results.return_value = True

        # Mock orchestrator as async generator
        async def mock_execute(*args, **kwargs):
            yield ("function_started", {"function_id": "my-func", "total_rows": 1})
            yield ("row_processing", {"row_index": 0, "total_rows": 1})
            yield (
                "row_complete",
                {"row_index": 0, "total_rows": 1, "result": {"email": "a@b.com"}},
            )
            yield (
                "function_complete",
                {
                    "function_id": "my-func",
                    "total_rows": 1,
                    "completed": 1,
                    "failed": 0,
                    "results": [{"email": "a@b.com"}],
                },
            )

        orchestrator = MagicMock()
        orchestrator.execute_message = mock_execute

        app = _make_app(channel_store=store, channel_orchestrator=orchestrator)
        client = TestClient(app)
        resp = client.post(
            "/channels/sess1/messages",
            json={"data": [{"domain": "acme.com"}]},
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        body = resp.text
        assert "event: function_started" in body
        assert "event: row_complete" in body
        assert "event: function_complete" in body

    def test_send_message_saves_messages(self):
        """Both user message and assistant message are saved to the store."""
        store = MagicMock()
        session = _mock_session(id="sess1")
        # get_session returns session with messages to determine assistant index
        session_with_msgs = _mock_session(
            id="sess1",
            messages=[
                ChannelMessage(
                    role="user", content="test", timestamp=1700000000.0
                ),
                ChannelMessage(
                    role="assistant",
                    content="Processing...",
                    timestamp=1700000000.0,
                    results=[],
                ),
            ],
        )
        store.get_session.side_effect = [session, session_with_msgs]
        store.add_message.return_value = ChannelMessage(
            role="user", content="test", timestamp=1700000000.0
        )
        store.update_message_results.return_value = True

        async def mock_execute(*args, **kwargs):
            yield (
                "function_complete",
                {"results": [{"email": "a@b.com"}]},
            )

        orchestrator = MagicMock()
        orchestrator.execute_message = mock_execute

        app = _make_app(channel_store=store, channel_orchestrator=orchestrator)
        client = TestClient(app)
        resp = client.post(
            "/channels/sess1/messages",
            json={"content": "enrich this", "data": [{"domain": "acme.com"}]},
        )
        assert resp.status_code == 200

        # User message and assistant message both saved
        assert store.add_message.call_count == 2
        user_call = store.add_message.call_args_list[0]
        assert user_call[0][0] == "sess1"
        assert user_call[0][1]["role"] == "user"

        assistant_call = store.add_message.call_args_list[1]
        assert assistant_call[0][0] == "sess1"
        assert assistant_call[0][1]["role"] == "assistant"

        # Results updated after streaming
        store.update_message_results.assert_called_once()

    def test_send_message_sse_error_handling(self):
        """SSE stream includes error event when orchestrator raises."""
        store = MagicMock()
        session = _mock_session(id="sess1")
        session_with_msgs = _mock_session(
            id="sess1",
            messages=[
                ChannelMessage(
                    role="user", content="test", timestamp=1700000000.0
                ),
                ChannelMessage(
                    role="assistant",
                    content="Processing...",
                    timestamp=1700000000.0,
                    results=[],
                ),
            ],
        )
        store.get_session.side_effect = [session, session_with_msgs]
        store.add_message.return_value = ChannelMessage(
            role="user", content="test", timestamp=1700000000.0
        )
        store.update_message_results.return_value = True

        async def mock_execute_error(*args, **kwargs):
            yield ("function_started", {"function_id": "my-func"})
            raise RuntimeError("Something broke")

        orchestrator = MagicMock()
        orchestrator.execute_message = mock_execute_error

        app = _make_app(channel_store=store, channel_orchestrator=orchestrator)
        client = TestClient(app)
        resp = client.post(
            "/channels/sess1/messages",
            json={"data": [{"domain": "acme.com"}]},
        )
        assert resp.status_code == 200
        body = resp.text
        assert "event: error" in body
        assert "Something broke" in body
