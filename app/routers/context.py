from fastapi import APIRouter, Request

from app.models.context import (
    CreateClientRequest,
    PromptPreviewRequest,
    UpdateClientRequest,
    UpdateKnowledgeBaseRequest,
)

router = APIRouter()


# ── Clients ──────────────────────────────────────────────────

@router.get("/clients")
async def list_clients(request: Request):
    store = request.app.state.context_store
    return {"clients": [c.model_dump() for c in store.list_clients()]}


@router.post("/clients")
async def create_client(body: CreateClientRequest, request: Request):
    store = request.app.state.context_store
    existing = store.get_client(body.slug)
    if existing is not None:
        return {"error": True, "error_message": f"Client '{body.slug}' already exists"}
    profile = store.create_client(body)
    return profile.model_dump()


@router.get("/clients/{slug}")
async def get_client(slug: str, request: Request):
    store = request.app.state.context_store
    profile = store.get_client(slug)
    if profile is None:
        return {"error": True, "error_message": f"Client '{slug}' not found"}
    return profile.model_dump()


@router.put("/clients/{slug}")
async def update_client(slug: str, body: UpdateClientRequest, request: Request):
    store = request.app.state.context_store
    profile = store.update_client(slug, body)
    if profile is None:
        return {"error": True, "error_message": f"Client '{slug}' not found"}
    return profile.model_dump()


@router.delete("/clients/{slug}")
async def delete_client(slug: str, request: Request):
    store = request.app.state.context_store
    if not store.delete_client(slug):
        return {"error": True, "error_message": f"Client '{slug}' not found"}
    return {"ok": True}


@router.get("/clients/{slug}/markdown")
async def get_client_markdown(slug: str, request: Request):
    store = request.app.state.context_store
    profile = store.get_client(slug)
    if profile is None:
        return {"error": True, "error_message": f"Client '{slug}' not found"}
    return {"slug": slug, "markdown": profile.raw_markdown}


# ── Knowledge Base ───────────────────────────────────────────

@router.get("/knowledge-base")
async def list_knowledge_base(request: Request):
    store = request.app.state.context_store
    files = store.list_knowledge_base()
    grouped: dict[str, list[dict]] = {}
    for f in files:
        grouped.setdefault(f.category, []).append(f.model_dump())
    return {"knowledge_base": grouped}


@router.get("/knowledge-base/{category}/{filename}")
async def get_knowledge_file(category: str, filename: str, request: Request):
    store = request.app.state.context_store
    f = store.get_knowledge_file(category, filename)
    if f is None:
        return {"error": True, "error_message": f"File '{category}/{filename}' not found"}
    return f.model_dump()


@router.put("/knowledge-base/{category}/{filename}")
async def update_knowledge_file(
    category: str, filename: str, body: UpdateKnowledgeBaseRequest, request: Request
):
    store = request.app.state.context_store
    f = store.update_knowledge_file(category, filename, body.content)
    if f is None:
        return {"error": True, "error_message": f"File '{category}/{filename}' not found"}
    return f.model_dump()


# ── Prompt Preview ───────────────────────────────────────────

@router.post("/context/preview")
async def preview_prompt(body: PromptPreviewRequest, request: Request):
    store = request.app.state.context_store
    result = store.preview_prompt(body.skill, body.client_slug, body.sample_data)
    if result is None:
        return {"error": True, "error_message": f"Skill '{body.skill}' not found"}
    return result.model_dump()
