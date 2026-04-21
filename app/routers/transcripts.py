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
import re
import shutil
from datetime import datetime
from pathlib import Path

import httpx
from fastapi import APIRouter, Query, Request
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


# ── Google Doc import ──────────────────────────────────────────

GDOC_ID_RE = re.compile(r"/d/([a-zA-Z0-9_-]{20,})")
SLUG_SAFE_RE = re.compile(r"[^a-z0-9-]+")


def _extract_doc_id(url: str) -> str | None:
    m = GDOC_ID_RE.search(url)
    return m.group(1) if m else None


def _slugify(text: str) -> str:
    s = text.strip().lower()
    s = SLUG_SAFE_RE.sub("-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "untitled"


class ImportGdocRequest(BaseModel):
    url: str
    client_slug: str
    filename: str | None = None  # optional override; otherwise derived from doc title


@router.get("/clients")
async def list_transcript_clients(_: Request):
    """Return real client slugs (folders under clients/, excluding _template/_templates)."""
    clients_root = Path(__file__).resolve().parents[2] / "clients"
    if not clients_root.exists():
        return {"clients": []}
    slugs = sorted(
        p.name for p in clients_root.iterdir()
        if p.is_dir() and not p.name.startswith("_")
    )
    return {"clients": slugs}


async def _do_gdoc_import(url: str, client_slug_in: str, filename: str | None):
    """Shared gdoc import logic. Returns (status_code, payload_dict)."""
    doc_id = _extract_doc_id(url)
    if not doc_id:
        return 400, {"error": True, "error_message": "Could not extract Google Doc ID from URL"}

    client_slug = _slugify(client_slug_in)
    if not client_slug:
        return 400, {"error": True, "error_message": "client_slug is required"}

    export_url = f"https://docs.google.com/document/d/{doc_id}/export?format=txt"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            resp = await client.get(export_url)
    except Exception as e:
        logger.exception("[transcripts] gdoc fetch failed")
        return 502, {"error": True, "error_message": f"Fetch failed: {e}"}

    if resp.status_code != 200:
        msg = (
            "Doc is not publicly readable. Set share to 'Anyone with the link → Viewer' and try again."
            if resp.status_code in (401, 403, 404)
            else f"Google returned HTTP {resp.status_code}"
        )
        return resp.status_code, {"error": True, "error_message": msg}

    text = resp.text.lstrip("\ufeff").strip()
    if not text:
        return 400, {"error": True, "error_message": "Doc is empty"}

    title_line = next((ln.strip() for ln in text.splitlines() if ln.strip()), doc_id)
    derived_name = _slugify(title_line)[:80] or doc_id

    if filename:
        fname = filename if filename.endswith(".md") else f"{filename}.md"
    else:
        ts = datetime.utcnow().strftime("%Y%m%d-%H%M")
        fname = f"{ts}-{derived_name}.md"

    inbox_dir = _root() / "inbox" / client_slug
    inbox_dir.mkdir(parents=True, exist_ok=True)
    dst = inbox_dir / fname

    header = (
        f"---\n"
        f"source: google-doc\n"
        f"source_url: {url}\n"
        f"doc_id: {doc_id}\n"
        f"imported_at: {datetime.utcnow().isoformat()}Z\n"
        f"client_slug: {client_slug}\n"
        f"---\n\n"
    )
    dst.write_text(header + text, encoding="utf-8")

    rel = dst.relative_to(_root())
    return 200, {
        "ok": True,
        "path": str(rel),
        "filename": fname,
        "client_slug": client_slug,
        "size": len(text),
    }


@router.post("/import-gdoc")
async def import_gdoc(body: ImportGdocRequest, _: Request):
    """Import a Google Doc by URL into transcripts/inbox/{client_slug}/. (admin)"""
    status, payload = await _do_gdoc_import(body.url, body.client_slug, body.filename)
    if status != 200:
        return JSONResponse(status_code=status, content=payload)
    return payload


@router.post("/import-gdoc/public")
async def import_gdoc_public(
    request: Request,
    body: ImportGdocRequest,
    token: str = Query(""),
):
    """Public (share-token authenticated) variant for the client portal-view page.

    Validates the share token against the portal store for the given client_slug.
    """
    portal_store = getattr(request.app.state, "portal_store", None)
    if portal_store is None:
        return JSONResponse(status_code=503, content={"error": True, "error_message": "Portal store unavailable"})
    if not token or not portal_store.validate_share_token(body.client_slug, token):
        return JSONResponse(status_code=403, content={"error": True, "error_message": "Invalid or expired share link"})

    status, payload = await _do_gdoc_import(body.url, body.client_slug, body.filename)
    if status != 200:
        return JSONResponse(status_code=status, content=payload)
    return payload



