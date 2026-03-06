from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/usage")
async def usage_summary(request: Request):
    usage_store = request.app.state.usage_store
    return usage_store.get_summary().model_dump()


@router.get("/usage/health")
async def usage_health(request: Request):
    usage_store = request.app.state.usage_store
    return usage_store.get_health()
