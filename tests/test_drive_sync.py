"""Tests for app.core.drive_sync — folder mapping + run export logic."""

from unittest.mock import AsyncMock, patch

import pytest

from app.core.drive_sync import DriveSync
from app.core.sheets_client import SheetsClient


def _make_client():
    """Create a SheetsClient mock that reports as available."""
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    return client


# ── DriveSync availability ───────────────────────────────


def test_available_when_client_available():
    client = _make_client()
    sync = DriveSync(client)
    assert sync.available is True


def test_not_available_when_client_unavailable():
    with patch("app.core.sheets_client._gws_available", return_value=False):
        client = SheetsClient()
    sync = DriveSync(client)
    assert sync.available is False


# ── ensure_folder_structure ──────────────────────────────


@pytest.mark.asyncio
async def test_ensure_folder_structure_creates_both():
    client = _make_client()
    client.ensure_root_folder = AsyncMock(return_value="root_id")
    client.ensure_subfolder = AsyncMock(return_value="sub_id")

    sync = DriveSync(client)
    result = await sync.ensure_folder_structure("Research")

    assert result == "sub_id"
    client.ensure_root_folder.assert_called_once()
    client.ensure_subfolder.assert_called_once_with("root_id", "Research")


@pytest.mark.asyncio
async def test_ensure_folder_structure_uses_cache():
    client = _make_client()
    client.ensure_root_folder = AsyncMock(return_value="root_id")
    client.ensure_subfolder = AsyncMock(return_value="sub_id")

    sync = DriveSync(client)
    result1 = await sync.ensure_folder_structure("Research")
    result2 = await sync.ensure_folder_structure("Research")

    assert result1 == result2 == "sub_id"
    # Second call uses cache — ensure_subfolder only called once
    assert client.ensure_subfolder.call_count == 1


@pytest.mark.asyncio
async def test_ensure_folder_structure_different_folders():
    client = _make_client()
    client.ensure_root_folder = AsyncMock(return_value="root_id")
    client.ensure_subfolder = AsyncMock(side_effect=["sub_a", "sub_b"])

    sync = DriveSync(client)
    a = await sync.ensure_folder_structure("Research")
    b = await sync.ensure_folder_structure("Content")

    assert a == "sub_a"
    assert b == "sub_b"
    assert client.ensure_subfolder.call_count == 2
    # Root should only be resolved once
    assert client.ensure_root_folder.call_count == 1


# ── export_run ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_export_run_returns_url():
    client = _make_client()
    client.ensure_root_folder = AsyncMock(return_value="root_id")
    client.ensure_subfolder = AsyncMock(return_value="folder_id")
    client.create_run_sheet = AsyncMock(return_value="sheet_abc")

    sync = DriveSync(client)
    result = await sync.export_run(
        folder_name="Research",
        function_name="Company Research",
        description="Test batch",
        inputs=[{"domain": "acme.com"}, {"domain": "foo.io"}],
        outputs=[{"summary": "OK"}, {"summary": "Good"}],
        run_metadata={"duration_ms": 5000},
    )

    assert result["spreadsheet_id"] == "sheet_abc"
    assert result["url"] == "https://docs.google.com/spreadsheets/d/sheet_abc"
    assert "Company Research" in result["title"]
    assert "2 rows" in result["title"]


@pytest.mark.asyncio
async def test_export_run_headers_prefix_collisions():
    """Output keys that collide with input keys get prefixed with 'out_'."""
    client = _make_client()
    client.ensure_root_folder = AsyncMock(return_value="root_id")
    client.ensure_subfolder = AsyncMock(return_value="folder_id")
    client.create_run_sheet = AsyncMock(return_value="sheet_xyz")

    sync = DriveSync(client)
    await sync.export_run(
        folder_name="Test",
        function_name="Test Func",
        description="collision test",
        inputs=[{"name": "Alice"}],
        outputs=[{"name": "Result", "score": "0.9"}],
        run_metadata={},
    )

    # Inspect headers passed to create_run_sheet
    call_kwargs = client.create_run_sheet.call_args
    headers = call_kwargs.kwargs.get("headers") or call_kwargs[1].get("headers") or call_kwargs[0][2]
    assert "name" in headers
    assert "out_name" in headers
    assert "score" in headers


@pytest.mark.asyncio
async def test_export_run_single_row():
    client = _make_client()
    client.ensure_root_folder = AsyncMock(return_value="root_id")
    client.ensure_subfolder = AsyncMock(return_value="folder_id")
    client.create_run_sheet = AsyncMock(return_value="sheet_one")

    sync = DriveSync(client)
    result = await sync.export_run(
        folder_name="Content",
        function_name="Email Gen",
        description="Single test",
        inputs=[{"email": "test@acme.com"}],
        outputs=[{"subject": "Hello"}],
        run_metadata={"status": "success"},
    )

    assert "1 row" in result["title"]  # singular
    assert "1 rows" not in result["title"]


@pytest.mark.asyncio
async def test_export_run_metadata_passed_through():
    client = _make_client()
    client.ensure_root_folder = AsyncMock(return_value="root_id")
    client.ensure_subfolder = AsyncMock(return_value="folder_id")
    client.create_run_sheet = AsyncMock(return_value="sheet_meta")

    sync = DriveSync(client)
    await sync.export_run(
        folder_name="Test",
        function_name="Func",
        description="meta test",
        inputs=[{"a": "1"}],
        outputs=[{"b": "2"}],
        run_metadata={"duration_ms": 1234, "custom_field": "value"},
    )

    call_kwargs = client.create_run_sheet.call_args
    run_info = call_kwargs.kwargs.get("run_info") or call_kwargs[1].get("run_info") or call_kwargs[0][4]
    assert run_info["duration_ms"] == 1234
    assert run_info["custom_field"] == "value"
    assert run_info["function"] == "Func"
    assert run_info["description"] == "meta test"


# ── list_folder_sheets ───────────────────────────────────


@pytest.mark.asyncio
async def test_list_folder_sheets():
    client = _make_client()
    client.ensure_root_folder = AsyncMock(return_value="root_id")
    client.ensure_subfolder = AsyncMock(return_value="folder_id")
    client.list_folder = AsyncMock(return_value=[
        {"id": "s1", "name": "Sheet 1", "createdTime": "2026-03-20", "mimeType": "application/vnd.google-apps.spreadsheet"},
        {"id": "f1", "name": "Subfolder", "createdTime": "2026-03-20", "mimeType": "application/vnd.google-apps.folder"},
    ])

    sync = DriveSync(client)
    result = await sync.list_folder_sheets("Research")

    assert len(result) == 1  # folder excluded
    assert result[0]["id"] == "s1"
    assert result[0]["url"] == "https://docs.google.com/spreadsheets/d/s1"


@pytest.mark.asyncio
async def test_list_folder_sheets_empty():
    client = _make_client()
    client.ensure_root_folder = AsyncMock(return_value="root_id")
    client.ensure_subfolder = AsyncMock(return_value="folder_id")
    client.list_folder = AsyncMock(return_value=[])

    sync = DriveSync(client)
    result = await sync.list_folder_sheets("Empty")
    assert result == []
