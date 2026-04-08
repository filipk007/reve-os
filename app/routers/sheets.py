import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("clay-webhook-os")
router = APIRouter(tags=["sheets"])


def _get_drive_sync(request: Request):
    """Get DriveSync from app state, or None if unavailable."""
    return getattr(request.app.state, "drive_sync", None)


@router.get("/sheets/status")
async def sheets_status(request: Request):
    """Check if Google Sheets integration is available."""
    drive_sync = _get_drive_sync(request)
    available = drive_sync is not None and drive_sync.available
    return {"available": available}


@router.get("/sheets/folders")
async def list_drive_folders(request: Request):
    """List Drive folders under 'Clay Functions/'."""
    drive_sync = _get_drive_sync(request)
    if not drive_sync or not drive_sync.available:
        return JSONResponse(
            status_code=503,
            content={"error": True, "error_message": "Google Sheets integration not available"},
        )

    try:
        root_id = await drive_sync.sheets_client.ensure_root_folder()
        files = await drive_sync.sheets_client.list_folder(root_id)
        folders = [
            {"name": f["name"], "id": f["id"], "created_at": f.get("createdTime", "")}
            for f in files
            if f.get("mimeType") == "application/vnd.google-apps.folder"
        ]
        return {"folders": folders}
    except Exception as e:
        logger.error("[sheets] Failed to list folders: %s", e)
        return JSONResponse(
            status_code=500,
            content={"error": True, "error_message": str(e)},
        )


@router.get("/sheets/folders/{name}")
async def list_folder_sheets(request: Request, name: str):
    """List sheets in a specific Drive folder."""
    drive_sync = _get_drive_sync(request)
    if not drive_sync or not drive_sync.available:
        return JSONResponse(
            status_code=503,
            content={"error": True, "error_message": "Google Sheets integration not available"},
        )

    try:
        sheets = await drive_sync.list_folder_sheets(name)
        return {"folder": name, "sheets": sheets, "total": len(sheets)}
    except Exception as e:
        logger.error("[sheets] Failed to list sheets in '%s': %s", name, e)
        return JSONResponse(
            status_code=500,
            content={"error": True, "error_message": str(e)},
        )


@router.get("/sheets/preview")
async def preview_sheet(request: Request):
    """Read a Google Sheet and return headers + rows as JSON (for enrichment wizard import)."""
    spreadsheet_id = request.query_params.get("spreadsheet_id", "")
    range_ = request.query_params.get("range", "Sheet1")

    if not spreadsheet_id:
        return JSONResponse(status_code=400, content={"error": True, "error_message": "Missing spreadsheet_id"})

    # Extract spreadsheet ID from full URL if needed
    if "docs.google.com" in spreadsheet_id:
        import re
        match = re.search(r"/d/([a-zA-Z0-9_-]+)", spreadsheet_id)
        if match:
            spreadsheet_id = match.group(1)

    drive_sync = _get_drive_sync(request)
    if not drive_sync or not drive_sync.available:
        return JSONResponse(status_code=503, content={"error": True, "error_message": "Google Sheets integration not available"})

    try:
        values = await drive_sync.sheets_client.read_values(spreadsheet_id, range_)
        if not values:
            return {"headers": [], "rows": [], "totalRows": 0}
        headers = values[0]
        data_rows = values[1:]
        return {
            "headers": headers,
            "rows": data_rows[:5],  # preview first 5
            "totalRows": len(data_rows),
            "spreadsheet_id": spreadsheet_id,
        }
    except Exception as e:
        logger.error("[sheets] Failed to preview sheet %s: %s", spreadsheet_id, e)
        return JSONResponse(status_code=500, content={"error": True, "error_message": str(e)})


@router.get("/sheets/{sheet_id}/info")
async def get_sheet_info(request: Request, sheet_id: str):
    """Get sheet metadata."""
    from app.core.sheets_client import SheetsClient

    drive_sync = _get_drive_sync(request)
    if not drive_sync or not drive_sync.available:
        return JSONResponse(
            status_code=503,
            content={"error": True, "error_message": "Google Sheets integration not available"},
        )

    return {
        "id": sheet_id,
        "url": SheetsClient.get_spreadsheet_url(sheet_id),
    }
