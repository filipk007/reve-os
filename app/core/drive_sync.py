"""Drive sync — manages folder mapping between function folders and Google Drive folders.

Exports function runs as Google Sheets into mirrored Drive folder structure:
  Google Drive / Clay Functions / {folder_name} / {run_title}.gsheet
"""

import logging
from datetime import datetime, timezone

from app.core.sheets_client import SheetsClient

logger = logging.getLogger("clay-webhook-os")


class DriveSync:
    """Maps function folders → Drive folders, exports runs as Sheets."""

    def __init__(self, sheets_client: SheetsClient) -> None:
        self.sheets_client = sheets_client
        self._root_id: str | None = None
        self._folder_cache: dict[str, str] = {}  # folder_name → drive_folder_id

    @property
    def available(self) -> bool:
        return self.sheets_client.available

    async def ensure_folder_structure(self, folder_name: str) -> str:
        """Ensure root + subfolder exist in Drive, return subfolder ID. Uses cache."""
        if folder_name in self._folder_cache:
            return self._folder_cache[folder_name]

        if self._root_id is None:
            self._root_id = await self.sheets_client.ensure_root_folder()

        subfolder_id = await self.sheets_client.ensure_subfolder(self._root_id, folder_name)
        self._folder_cache[folder_name] = subfolder_id
        return subfolder_id

    async def export_run(
        self,
        folder_name: str,
        function_name: str,
        description: str,
        inputs: list[dict],
        outputs: list[dict],
        run_metadata: dict,
    ) -> dict:
        """Create a new Sheet for this run in the matching Drive folder.

        Returns: {"spreadsheet_id": "...", "url": "https://docs.google.com/...", "title": "..."}
        """
        folder_id = await self.ensure_folder_structure(folder_name)

        # Build title: "Function Name — N rows — Mar 20"
        date_str = datetime.now(timezone.utc).strftime("%b %d")
        row_count = len(inputs)
        title = f"{function_name} — {row_count} row{'s' if row_count != 1 else ''} — {date_str}"

        # Merge input + output keys for headers
        input_keys = list(inputs[0].keys()) if inputs else []
        output_keys = list(outputs[0].keys()) if outputs else []
        # Prefix output keys that collide with input keys
        headers = list(input_keys)
        for k in output_keys:
            headers.append(f"out_{k}" if k in input_keys else k)

        # Build data rows
        rows: list[list] = []
        for inp, out in zip(inputs, outputs):
            row = [str(inp.get(k, "")) for k in input_keys]
            row += [str(out.get(k, "")) for k in output_keys]
            rows.append(row)

        # Run info metadata
        run_info = {
            "function": function_name,
            "description": description,
            "row_count": row_count,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            **run_metadata,
        }

        spreadsheet_id = await self.sheets_client.create_run_sheet(
            folder_id=folder_id,
            title=title,
            headers=headers,
            rows=rows,
            run_info=run_info,
        )

        url = SheetsClient.get_spreadsheet_url(spreadsheet_id)
        logger.info(
            "[drive_sync] Exported '%s' (%d rows) → %s",
            function_name, row_count, url,
        )

        return {
            "spreadsheet_id": spreadsheet_id,
            "url": url,
            "title": title,
        }

    async def list_folder_sheets(self, folder_name: str) -> list[dict]:
        """List all sheets in a Drive folder. Returns [{id, name, created_at, url}]."""
        folder_id = await self.ensure_folder_structure(folder_name)
        files = await self.sheets_client.list_folder(folder_id)

        return [
            {
                "id": f["id"],
                "title": f["name"],
                "created_at": f.get("createdTime", ""),
                "url": SheetsClient.get_spreadsheet_url(f["id"]),
            }
            for f in files
            if f.get("mimeType") == "application/vnd.google-apps.spreadsheet"
        ]
