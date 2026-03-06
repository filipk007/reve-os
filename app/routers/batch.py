import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from app.config import settings
from app.core.scheduler import ScheduledBatch
from app.core.skill_loader import load_skill
from app.models.requests import BatchRequest

router = APIRouter()


@router.post("/batch")
async def batch(body: BatchRequest, request: Request):
    queue = request.app.state.job_queue
    model = body.model or settings.default_model
    priority = body.priority or "normal"

    skill_content = load_skill(body.skill)
    if skill_content is None:
        return {"error": True, "error_message": f"Skill '{body.skill}' not found"}

    batch_id = uuid.uuid4().hex[:12]

    # Scheduled batch: defer to scheduler
    if body.scheduled_at:
        try:
            scheduled_ts = datetime.fromisoformat(body.scheduled_at).timestamp()
        except ValueError:
            return {"error": True, "error_message": "Invalid scheduled_at format. Use ISO 8601."}

        if scheduled_ts <= time.time():
            return {"error": True, "error_message": "scheduled_at must be in the future"}

        scheduler = request.app.state.scheduler
        sb = ScheduledBatch(
            id=batch_id,
            skill=body.skill,
            rows=body.rows,
            instructions=body.instructions,
            model=model,
            priority=priority,
            scheduled_at=scheduled_ts,
        )
        scheduler.schedule(sb)
        return {
            "batch_id": batch_id,
            "total_rows": len(body.rows),
            "scheduled_at": body.scheduled_at,
            "status": "scheduled",
        }

    # Immediate batch: enqueue now
    job_ids = []
    for i, row in enumerate(body.rows):
        job_id = await queue.enqueue(
            skill=body.skill,
            data=row,
            instructions=body.instructions,
            model=model,
            callback_url="",
            row_id=row.get("row_id", str(i)),
            priority=priority,
        )
        job_ids.append(job_id)

    return {
        "batch_id": batch_id,
        "total_rows": len(body.rows),
        "job_ids": job_ids,
    }
