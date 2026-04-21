"""Transcripts router — list and move transcript files for the feedback loop.

Folder layout:
    transcripts/
        inbox/{client_slug}/*.md     — unprocessed
        processed/{client_slug}/*.md — committed
        summaries/                    — (reserved)

Endpoints:
    GET  /transcripts                       — list inbox + processed
    POST /transcripts/mark-processed        — move a file from inbox to processed
"""
from __future__ import annotations

import logging
import shutil
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/transcripts", tags=["transcripts"])
logger = logging.getLogger("clay-webhook-os")


def _root() -> Path:
    # app/routers/transcripts.py -> project root
    return Path(__file__).resolve().parents[2] / "transcripts"


def _scan(bucket: str) -> list[dict]:
    base = _root() / bucket
    if not base.exists():
        return []
    items: list[dict] = []
    for p in base.rglob("*.md"):
        if p.name.startswith("."):
            continue
        try:
            stat = p.stat()
        except OSError:
            continue
        rel = p.relative_to(_root())
        # Expect shape: {bucket}/{client_slug}/{filename}
        parts = rel.parts
        client_slug = parts[1] if len(parts) >= 3 else ""
        items.append(
            {
                "bucket": bucket,
                "path": str(rel),  # e.g. "inbox/fivefox-fintech/test-001.md"
                "client_slug": client_slug,
                "filename": p.name,
                "size": stat.st_size,
                "mtime": stat.st_mtime,
            }
        )
    items.sort(key=lambda x: x["mtime"], reverse=True)
    return items


@router.get("")
async def list_transcripts(_: Request):
    return {
        "inbox": _scan("inbox"),
        "processed": _scan("processed"),
    }


class MarkProcessedRequest(BaseModel):
    path: str  # relative path under transcripts/, e.g. "inbox/fivefox-fintech/test-001.md"


@router.post("/mark-processed")
async def mark_processed(body: MarkProcessedRequest, _: Request):
    root = _root()
    src = (root / body.path).resolve()
    try:
        src.relative_to(root.resolve())
    except ValueError:
        return JSONResponse(status_code=400, content={"error": True, "error_message": "Path escapes transcripts root"})
    if not src.exists() or not src.is_file():
        return JSONResponse(status_code=404, content={"error": True, "error_message": "File not found"})
    if src.parts[-3] != "inbox" if len(src.parts) >= 3 else True:
        # accept only inbox/{client}/{file}
        rel = src.relative_to(root.resolve())
        if rel.parts[0] != "inbox":
            return JSONResponse(status_code=400, content={"error": True, "error_message": "Only inbox files can be marked processed"})
    rel = src.relative_to(root.resolve())
    dst = root / "processed" / Path(*rel.parts[1:])
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        shutil.move(str(src), str(dst))
    except Exception as e:
        logger.exception("[transcripts] move failed")
        return JSONResponse(status_code=500, content={"error": True, "error_message": str(e)})
    return {"ok": True, "path": str(dst.relative_to(root))}
