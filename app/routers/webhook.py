import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.context_assembler import build_prompt
from app.core.skill_loader import load_context_files, load_skill
from app.models.requests import WebhookRequest

router = APIRouter()
logger = logging.getLogger("clay-webhook-os")


def _error(message: str, skill: str = "unknown") -> dict:
    return {"error": True, "error_message": message, "skill": skill}


@router.post("/webhook")
async def webhook(body: WebhookRequest, request: Request):
    pool = request.app.state.pool
    cache = request.app.state.cache
    model = body.model or settings.default_model

    # --- Async mode: queue and return immediately ---
    if body.callback_url:
        queue = request.app.state.job_queue

        # Validate skill exists before queuing
        skill_content = load_skill(body.skill)
        if skill_content is None:
            return _error(f"Skill '{body.skill}' not found", body.skill)

        job_id = await queue.enqueue(
            skill=body.skill,
            data=body.data,
            instructions=body.instructions,
            model=model,
            callback_url=body.callback_url,
            row_id=body.row_id,
        )
        return JSONResponse(
            status_code=202,
            content={
                "accepted": True,
                "job_id": job_id,
                "queue_position": queue.pending,
                "skill": body.skill,
            },
        )

    # --- Sync mode: process and return result ---
    skill_content = load_skill(body.skill)
    if skill_content is None:
        return _error(f"Skill '{body.skill}' not found", body.skill)

    # Check cache
    cached = cache.get(body.skill, body.data, body.instructions)
    if cached is not None:
        logger.info("[%s] Cache hit", body.skill)
        return {
            **cached,
            "_meta": {
                "skill": body.skill,
                "model": model,
                "duration_ms": 0,
                "cached": True,
            },
        }

    # Build prompt
    context_files = load_context_files(skill_content, body.data)
    prompt = build_prompt(skill_content, context_files, body.data, body.instructions)

    logger.info(
        "[%s] Processing (model=%s, context_files=%d, prompt_len=%d)",
        body.skill,
        model,
        len(context_files),
        len(prompt),
    )

    # Execute via worker pool
    try:
        result = await pool.submit(prompt, model, settings.request_timeout)
    except TimeoutError:
        return _error(f"Request timed out after {settings.request_timeout}s", body.skill)
    except Exception as e:
        logger.error("[%s] Execution error: %s", body.skill, e)
        return _error(f"Execution error: {e}", body.skill)

    parsed = result["result"]

    # Cache result
    cache.put(body.skill, body.data, body.instructions, parsed)

    return {
        **parsed,
        "_meta": {
            "skill": body.skill,
            "model": model,
            "duration_ms": result["duration_ms"],
            "cached": False,
        },
    }
