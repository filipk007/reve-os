"""Tests for app.core.sheets_client — gws subprocess wrapper."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.sheets_client import SheetsClient, _gws_available


# ── Availability ─────────────────────────────────────────


def test_gws_available_when_installed():
    with patch("app.core.sheets_client.shutil.which", return_value="/usr/local/bin/gws"):
        assert _gws_available() is True


def test_gws_not_available():
    with patch("app.core.sheets_client.shutil.which", return_value=None):
        assert _gws_available() is False


def test_client_available_property():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
        assert client.available is True


def test_client_not_available_property():
    with patch("app.core.sheets_client._gws_available", return_value=False):
        client = SheetsClient()
        assert client.available is False


# ── _run_gws ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_run_gws_raises_when_not_available():
    with patch("app.core.sheets_client._gws_available", return_value=False):
        client = SheetsClient()
        with pytest.raises(RuntimeError, match="not installed"):
            await client._run_gws("drive", "files", "list")


@pytest.mark.asyncio
async def test_run_gws_parses_json_output():
    mock_proc = AsyncMock()
    mock_proc.communicate = AsyncMock(
        return_value=(json.dumps({"files": [{"id": "abc"}]}).encode(), b"")
    )
    mock_proc.returncode = 0

    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()

    with patch("asyncio.create_subprocess_exec", return_value=mock_proc):
        result = await client._run_gws("drive", "files", "list")
        assert result == {"files": [{"id": "abc"}]}


@pytest.mark.asyncio
async def test_run_gws_raises_on_nonzero_exit():
    mock_proc = AsyncMock()
    mock_proc.communicate = AsyncMock(return_value=(b"", b"auth error"))
    mock_proc.returncode = 1

    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()

    with patch("asyncio.create_subprocess_exec", return_value=mock_proc):
        with pytest.raises(RuntimeError, match="auth error"):
            await client._run_gws("drive", "files", "list")


@pytest.mark.asyncio
async def test_run_gws_returns_empty_dict_for_empty_output():
    mock_proc = AsyncMock()
    mock_proc.communicate = AsyncMock(return_value=(b"", b""))
    mock_proc.returncode = 0

    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()

    with patch("asyncio.create_subprocess_exec", return_value=mock_proc):
        result = await client._run_gws("drive", "files", "list")
        assert result == {}


@pytest.mark.asyncio
async def test_run_gws_wraps_non_json_output():
    mock_proc = AsyncMock()
    mock_proc.communicate = AsyncMock(return_value=(b"Success", b""))
    mock_proc.returncode = 0

    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()

    with patch("asyncio.create_subprocess_exec", return_value=mock_proc):
        result = await client._run_gws("drive", "files", "list")
        assert result == {"raw": "Success"}


# ── find_folder ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_find_folder_found():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client._run_gws = AsyncMock(return_value={"files": [{"id": "folder123", "name": "Test"}]})
    result = await client.find_folder("Test")
    assert result == "folder123"


@pytest.mark.asyncio
async def test_find_folder_not_found():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client._run_gws = AsyncMock(return_value={"files": []})
    result = await client.find_folder("Missing")
    assert result is None


@pytest.mark.asyncio
async def test_find_folder_with_parent():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client._run_gws = AsyncMock(return_value={"files": [{"id": "sub123", "name": "Sub"}]})
    result = await client.find_folder("Sub", parent_id="parent123")
    assert result == "sub123"
    # Verify parent_id was included in the query
    call_args = client._run_gws.call_args
    # args are ("drive", "files", "list", "--params", json_str)
    params = json.loads(call_args[0][4])
    assert "'parent123' in parents" in params["q"]


# ── create_folder ────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_folder():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client._run_gws = AsyncMock(return_value={"id": "new_folder"})
    result = await client.create_folder("Research")
    assert result == "new_folder"


@pytest.mark.asyncio
async def test_create_folder_with_parent():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client._run_gws = AsyncMock(return_value={"id": "sub_folder"})
    result = await client.create_folder("Sub", parent_id="root123")
    assert result == "sub_folder"
    call_args = client._run_gws.call_args
    # args are ("drive", "files", "create", "--json", json_str)
    metadata = json.loads(call_args[0][4])
    assert metadata["parents"] == ["root123"]


@pytest.mark.asyncio
async def test_create_folder_raises_on_failure():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client._run_gws = AsyncMock(return_value={})
    with pytest.raises(RuntimeError, match="Failed to create folder"):
        await client.create_folder("Bad")


# ── ensure_root_folder ───────────────────────────────────


@pytest.mark.asyncio
async def test_ensure_root_folder_exists():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client.find_folder = AsyncMock(return_value="existing_root")
    result = await client.ensure_root_folder()
    assert result == "existing_root"


@pytest.mark.asyncio
async def test_ensure_root_folder_creates():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client.find_folder = AsyncMock(return_value=None)
    client.create_folder = AsyncMock(return_value="new_root")
    result = await client.ensure_root_folder()
    assert result == "new_root"


# ── ensure_subfolder ─────────────────────────────────────


@pytest.mark.asyncio
async def test_ensure_subfolder_exists():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client.find_folder = AsyncMock(return_value="existing_sub")
    result = await client.ensure_subfolder("root123", "Research")
    assert result == "existing_sub"


@pytest.mark.asyncio
async def test_ensure_subfolder_creates():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client.find_folder = AsyncMock(return_value=None)
    client.create_folder = AsyncMock(return_value="new_sub")
    result = await client.ensure_subfolder("root123", "Research")
    assert result == "new_sub"
    client.create_folder.assert_called_once_with("Research", parent_id="root123")


# ── list_folder ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_folder():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client._run_gws = AsyncMock(return_value={
        "files": [
            {"id": "s1", "name": "Sheet 1", "createdTime": "2026-03-20T00:00:00Z", "mimeType": "application/vnd.google-apps.spreadsheet"},
        ]
    })
    result = await client.list_folder("folder123")
    assert len(result) == 1
    assert result[0]["id"] == "s1"


# ── create_spreadsheet ───────────────────────────────────


@pytest.mark.asyncio
async def test_create_spreadsheet():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    client._run_gws = AsyncMock(return_value={"spreadsheetId": "sheet123"})
    result = await client.create_spreadsheet("Test Sheet")
    assert result == "sheet123"


@pytest.mark.asyncio
async def test_create_spreadsheet_with_folder():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()
    call_count = 0

    async def mock_run_gws(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return {"spreadsheetId": "sheet456"}
        return {}

    client._run_gws = mock_run_gws
    result = await client.create_spreadsheet("Test", folder_id="folder123")
    assert result == "sheet456"
    assert call_count == 2  # create + move to folder


# ── create_run_sheet ─────────────────────────────────────


@pytest.mark.asyncio
async def test_create_run_sheet():
    with patch("app.core.sheets_client._gws_available", return_value=True):
        client = SheetsClient()

    client.create_spreadsheet = AsyncMock(return_value="run_sheet_id")
    client.write_values = AsyncMock()
    client.add_sheet_tab = AsyncMock(return_value=1)

    result = await client.create_run_sheet(
        folder_id="folder123",
        title="Test Run — 3 rows — Mar 20",
        headers=["name", "email", "result"],
        rows=[["Alice", "a@b.com", "OK"], ["Bob", "b@c.com", "OK"]],
        run_info={"function": "test", "duration_ms": 1500},
    )

    assert result == "run_sheet_id"
    client.create_spreadsheet.assert_called_once_with("Test Run — 3 rows — Mar 20", folder_id="folder123")
    assert client.write_values.call_count == 2  # data + run info
    client.add_sheet_tab.assert_called_once_with("run_sheet_id", "Run Info")


# ── get_spreadsheet_url ──────────────────────────────────


def test_get_spreadsheet_url():
    url = SheetsClient.get_spreadsheet_url("abc123")
    assert url == "https://docs.google.com/spreadsheets/d/abc123"
