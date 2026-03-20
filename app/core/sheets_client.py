"""Google Sheets + Drive client — wraps `gws` CLI subprocess.

Same async subprocess pattern as claude_executor.py.
Graceful degradation: if gws is not installed or not authed, methods raise RuntimeError.
"""

import asyncio
import json
import logging
import shutil

logger = logging.getLogger("clay-webhook-os")


def _gws_available() -> bool:
    """Check if gws CLI is installed."""
    return shutil.which("gws") is not None


class SheetsClient:
    """Low-level wrapper around gws CLI for Drive + Sheets operations."""

    def __init__(self) -> None:
        self._available = _gws_available()
        if not self._available:
            logger.warning("[sheets] gws CLI not found — Google Sheets features disabled")

    @property
    def available(self) -> bool:
        return self._available

    async def _run_gws(self, *args: str, input_json: dict | None = None) -> dict:
        """Run a gws CLI command and parse JSON output."""
        if not self._available:
            raise RuntimeError("gws CLI is not installed")

        cmd = ["gws", *args]
        stdin_data = json.dumps(input_json).encode() if input_json else None

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE if stdin_data else None,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=stdin_data),
                timeout=30,
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise RuntimeError("gws command timed out after 30s")

        if proc.returncode != 0:
            err = stderr.decode().strip()
            raise RuntimeError(f"gws exited with code {proc.returncode}: {err}")

        raw = stdout.decode().strip()
        if not raw:
            return {}

        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # Some gws commands return non-JSON; wrap it
            return {"raw": raw}

    # ── Drive folder management ──────────────────────────────

    async def find_folder(self, name: str, parent_id: str | None = None) -> str | None:
        """Find a folder by name (optionally under a parent). Returns folder ID or None."""
        query = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        if parent_id:
            query += f" and '{parent_id}' in parents"

        result = await self._run_gws(
            "drive", "files", "list",
            "--params", json.dumps({"q": query, "pageSize": 1, "fields": "files(id,name)"}),
        )

        files = result.get("files", [])
        if files:
            return files[0]["id"]
        return None

    async def create_folder(self, name: str, parent_id: str | None = None) -> str:
        """Create a Drive folder. Returns folder ID."""
        metadata: dict = {
            "name": name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        if parent_id:
            metadata["parents"] = [parent_id]

        result = await self._run_gws(
            "drive", "files", "create",
            "--json", json.dumps(metadata),
        )
        folder_id = result.get("id", "")
        if not folder_id:
            raise RuntimeError(f"Failed to create folder '{name}': {result}")
        logger.info("[sheets] Created Drive folder '%s' (id=%s)", name, folder_id)
        return folder_id

    async def ensure_root_folder(self) -> str:
        """Find or create 'Clay Functions' root folder in Drive. Return folder ID."""
        folder_id = await self.find_folder("Clay Functions")
        if folder_id:
            return folder_id
        return await self.create_folder("Clay Functions")

    async def ensure_subfolder(self, root_id: str, folder_name: str) -> str:
        """Find or create subfolder under root. Return folder ID."""
        folder_id = await self.find_folder(folder_name, parent_id=root_id)
        if folder_id:
            return folder_id
        return await self.create_folder(folder_name, parent_id=root_id)

    # ── List folder contents ─────────────────────────────────

    async def list_folder(self, folder_id: str) -> list[dict]:
        """List files in a Drive folder. Returns list of {id, name, createdTime, mimeType}."""
        query = f"'{folder_id}' in parents and trashed=false"
        result = await self._run_gws(
            "drive", "files", "list",
            "--params", json.dumps({
                "q": query,
                "pageSize": 100,
                "fields": "files(id,name,createdTime,mimeType)",
                "orderBy": "createdTime desc",
            }),
        )
        return result.get("files", [])

    # ── Sheet creation ───────────────────────────────────────

    async def create_spreadsheet(self, title: str, folder_id: str | None = None) -> str:
        """Create a new empty spreadsheet. Returns spreadsheet ID."""
        body = {"properties": {"title": title}}
        result = await self._run_gws(
            "sheets", "spreadsheets", "create",
            "--json", json.dumps(body),
        )
        spreadsheet_id = result.get("spreadsheetId", "")
        if not spreadsheet_id:
            raise RuntimeError(f"Failed to create spreadsheet '{title}': {result}")

        # Move to folder if specified
        if folder_id:
            await self._run_gws(
                "drive", "files", "update",
                "--fileId", spreadsheet_id,
                "--params", json.dumps({"addParents": folder_id, "removeParents": "root"}),
            )

        logger.info("[sheets] Created spreadsheet '%s' (id=%s)", title, spreadsheet_id)
        return spreadsheet_id

    async def write_values(
        self, spreadsheet_id: str, range_: str, values: list[list]
    ) -> None:
        """Write values to a spreadsheet range."""
        body = {
            "range": range_,
            "majorDimension": "ROWS",
            "values": values,
        }
        await self._run_gws(
            "sheets", "spreadsheets.values", "update",
            "--spreadsheetId", spreadsheet_id,
            "--range", range_,
            "--params", json.dumps({"valueInputOption": "RAW"}),
            "--json", json.dumps(body),
        )

    async def add_sheet_tab(self, spreadsheet_id: str, title: str) -> int:
        """Add a new sheet tab to a spreadsheet. Returns sheet ID."""
        body = {
            "requests": [{
                "addSheet": {
                    "properties": {"title": title}
                }
            }]
        }
        result = await self._run_gws(
            "sheets", "spreadsheets", "batchUpdate",
            "--spreadsheetId", spreadsheet_id,
            "--json", json.dumps(body),
        )
        replies = result.get("replies", [])
        if replies:
            return replies[0].get("addSheet", {}).get("properties", {}).get("sheetId", 0)
        return 0

    async def create_run_sheet(
        self,
        folder_id: str,
        title: str,
        headers: list[str],
        rows: list[list],
        run_info: dict,
    ) -> str:
        """Create spreadsheet in folder, write headers + rows + info tab. Return spreadsheet ID."""
        spreadsheet_id = await self.create_spreadsheet(title, folder_id=folder_id)

        # Write data to Sheet1: headers + rows
        all_values = [headers] + rows
        await self.write_values(spreadsheet_id, "Sheet1!A1", all_values)

        # Add "Run Info" tab with metadata
        await self.add_sheet_tab(spreadsheet_id, "Run Info")
        info_rows = [[k, str(v)] for k, v in run_info.items()]
        await self.write_values(spreadsheet_id, "'Run Info'!A1", info_rows)

        return spreadsheet_id

    @staticmethod
    def get_spreadsheet_url(spreadsheet_id: str) -> str:
        """Return the web URL for the spreadsheet."""
        return f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"
