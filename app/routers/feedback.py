import logging

from fastapi import APIRouter, HTTPException, Request

from app.models.feedback import FeedbackEntry, SubmitFeedbackRequest

router = APIRouter(prefix="/feedback", tags=["feedback"])
logger = logging.getLogger("clay-webhook-os")


# ── Review Queue ─────────────────────────────────────────────


@router.get("/review-queue")
async def review_queue(
    request: Request,
    skill: str | None = None,
    client_slug: str | None = None,
    state: str = "all",  # all | unrated | thumbs_up | thumbs_down
    limit: int = 100,
):
    """Return recent jobs with their feedback entries joined.

    Powers the Review tab. Filters:
    - skill: exact match
    - client_slug: exact match (from job.data.client_slug)
    - state: all | unrated (no feedback yet) | thumbs_up | thumbs_down
    """
    queue = request.app.state.job_queue
    store = request.app.state.feedback_store

    jobs = queue.get_jobs(limit=min(max(limit, 10), 500))
    results = []
    for j in jobs:
        job_obj = queue.get_job(j["id"])
        if job_obj is None:
            continue
        if skill and j.get("skill") != skill:
            continue
        job_client = (job_obj.data or {}).get("client_slug") or None
        if client_slug and job_client != client_slug:
            continue

        feedback_entries = store.get_job_feedback(j["id"])
        current_rating = feedback_entries[-1].rating if feedback_entries else None

        if state == "unrated" and current_rating is not None:
            continue
        if state == "thumbs_up" and current_rating != "thumbs_up":
            continue
        if state == "thumbs_down" and current_rating != "thumbs_down":
            continue

        # Extract a short result preview
        preview = ""
        try:
            if isinstance(job_obj.result, dict):
                for key in ("email_subject", "email_body", "output", "summary"):
                    if key in job_obj.result and isinstance(job_obj.result[key], str):
                        preview = job_obj.result[key][:240]
                        break
                if not preview:
                    import json
                    preview = json.dumps(job_obj.result)[:240]
        except Exception:
            preview = ""

        results.append({
            **j,
            "client_slug": job_client,
            "current_rating": current_rating,
            "feedback_count": len(feedback_entries),
            "feedback": [e.model_dump() for e in feedback_entries],
            "result_preview": preview,
            "status": job_obj.status,
        })

    return {
        "total": len(results),
        "jobs": results,
    }


@router.post("/bulk")
async def submit_feedback_bulk(request: Request):
    """Submit same rating + optional note to multiple jobs at once.

    Body: {"job_ids": [...], "rating": "thumbs_up"|"thumbs_down", "note": "..."}
    Each job is processed independently — partial failures are reported.
    """
    body = await request.json()
    job_ids = body.get("job_ids") or []
    rating = body.get("rating")
    note = body.get("note") or None
    if not isinstance(job_ids, list) or not job_ids:
        raise HTTPException(status_code=400, detail="job_ids must be a non-empty list")
    if rating not in ("thumbs_up", "thumbs_down"):
        raise HTTPException(status_code=400, detail="rating must be thumbs_up or thumbs_down")

    store = request.app.state.feedback_store
    queue = request.app.state.job_queue
    learning_engine = getattr(request.app.state, "learning_engine", None)

    results = []
    learnings_extracted = 0
    for jid in job_ids:
        job = queue.get_job(jid)
        if job is None:
            results.append({"job_id": jid, "ok": False, "error": "job_not_found"})
            continue
        client_slug = (job.data or {}).get("client_slug")
        entry = FeedbackEntry(
            job_id=jid,
            skill=job.skill,
            model=job.model,
            client_slug=client_slug,
            rating=rating,
            note=note,
        )
        try:
            saved = store.submit(entry)
            results.append({"job_id": jid, "ok": True, "feedback_id": saved.id})

            if learning_engine and rating == "thumbs_down" and note:
                try:
                    learning_engine.extract_learning(
                        skill=job.skill,
                        client_slug=client_slug,
                        note=note,
                        rating=rating,
                    )
                    learnings_extracted += 1
                except Exception as e:
                    logger.warning("[feedback/bulk] learning extract failed: %s", e)
        except Exception as e:
            results.append({"job_id": jid, "ok": False, "error": str(e)})

    ok_count = sum(1 for r in results if r["ok"])
    return {
        "total": len(job_ids),
        "ok": ok_count,
        "failed": len(job_ids) - ok_count,
        "learnings_extracted": learnings_extracted,
        "results": results,
    }


@router.post("")
async def submit_feedback(body: SubmitFeedbackRequest, request: Request):
    store = request.app.state.feedback_store
    queue = request.app.state.job_queue

    # Auto-populate skill/model from job if available
    skill = body.skill
    model = body.model or "opus"
    if not skill:
        job = queue.get_job(body.job_id)
        if job:
            skill = job.skill
            model = job.model
        else:
            raise HTTPException(status_code=400, detail="skill is required when job not found")

    entry = FeedbackEntry(
        job_id=body.job_id,
        skill=skill,
        model=model,
        client_slug=body.client_slug,
        rating=body.rating,
        note=body.note,
    )
    result = store.submit(entry)

    # Auto-extract learning from thumbs-down feedback
    learning = None
    learning_engine = getattr(request.app.state, "learning_engine", None)
    if learning_engine and body.rating == "thumbs_down" and body.note:
        try:
            learning = learning_engine.extract_learning(
                skill=skill,
                client_slug=body.client_slug,
                note=body.note,
                rating=body.rating,
            )
        except Exception as e:
            logger.warning("[feedback] Learning extraction failed: %s", e)

    response = result.model_dump()
    if learning:
        response["learning_extracted"] = True
    return response


@router.get("/analytics/summary")
async def get_analytics(
    request: Request,
    skill: str | None = None,
    client_slug: str | None = None,
    days: int | None = None,
):
    store = request.app.state.feedback_store
    summary = store.get_analytics(skill=skill, client_slug=client_slug, days=days)
    return summary.model_dump()


@router.get("/analytics/{skill}")
async def get_skill_analytics(skill: str, request: Request, days: int | None = None):
    store = request.app.state.feedback_store
    summary = store.get_analytics(skill=skill, days=days)
    return summary.model_dump()


@router.get("/alerts")
async def get_quality_alerts(request: Request, threshold: float = 0.7):
    """Phase 2: Quality alerts — skills with approval rate below threshold."""
    store = request.app.state.feedback_store
    summary = store.get_analytics(days=7)
    alerts = []
    for skill_analytics in summary.by_skill:
        if skill_analytics.total >= 5 and skill_analytics.approval_rate < threshold:
            alerts.append({
                "skill": skill_analytics.skill,
                "approval_rate": skill_analytics.approval_rate,
                "total_ratings": skill_analytics.total,
                "thumbs_down": skill_analytics.thumbs_down,
                "severity": "critical" if skill_analytics.approval_rate < 0.5 else "warning",
                "recommendation": f"Review {skill_analytics.skill} skill — approval rate is {skill_analytics.approval_rate:.0%}",
            })
    return {"alerts": alerts, "threshold": threshold}


@router.post("/rerun/{job_id}")
async def rerun_with_feedback(job_id: str, request: Request):
    """Phase 2: Re-execute a job incorporating feedback corrections."""
    queue = request.app.state.job_queue
    store = request.app.state.feedback_store
    pool = request.app.state.pool

    job = queue.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    feedback_entries = store.get_job_feedback(job_id)
    corrections = [e for e in feedback_entries if e.rating == "thumbs_down" and e.note]

    if not corrections:
        raise HTTPException(status_code=400, detail="No thumbs-down feedback with notes found for this job")

    # Build correction instructions from feedback
    correction_notes = "\n".join(f"- {e.note}" for e in corrections)
    enhanced_instructions = f"""IMPORTANT CORRECTIONS (based on reviewer feedback):
{correction_notes}

Please regenerate the output incorporating these corrections."""

    original_instructions = job.instructions or ""
    if original_instructions:
        enhanced_instructions = f"{original_instructions}\n\n{enhanced_instructions}"

    from app.core.context_assembler import build_prompt
    from app.core.skill_loader import load_context_files, load_skill

    skill_content = load_skill(job.skill)
    if skill_content is None:
        raise HTTPException(status_code=400, detail=f"Skill '{job.skill}' not found")

    context_files = load_context_files(skill_content, job.data, skill_name=job.skill)
    prompt = build_prompt(skill_content, context_files, job.data, enhanced_instructions)

    try:
        result = await pool.submit(prompt, job.model)
        return {
            "ok": True,
            "original_job_id": job_id,
            "skill": job.skill,
            "result": result["result"],
            "duration_ms": result["duration_ms"],
            "corrections_applied": len(corrections),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Re-execution failed: {e}")


@router.get("/{job_id}")
async def get_job_feedback(job_id: str, request: Request):
    store = request.app.state.feedback_store
    entries = store.get_job_feedback(job_id)
    return {"job_id": job_id, "feedback": [e.model_dump() for e in entries]}


@router.delete("/{feedback_id}")
async def delete_feedback(feedback_id: str, request: Request):
    store = request.app.state.feedback_store
    deleted = store.delete(feedback_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"ok": True}


# ── Learnings (Feedback-to-Knowledge Pipeline) ───────────────


@router.get("/learnings")
async def list_learnings_clients(request: Request):
    """List all clients that have accumulated learnings."""
    engine = getattr(request.app.state, "learning_engine", None)
    if not engine:
        return {"clients": []}
    return {"clients": engine.list_clients_with_learnings()}


@router.get("/learnings/{client_slug}")
async def get_learnings(
    client_slug: str,
    request: Request,
    skill: str | None = None,
    limit: int = 20,
):
    """Get learnings for a client, optionally filtered by skill."""
    engine = getattr(request.app.state, "learning_engine", None)
    if not engine:
        return {"client_slug": client_slug, "learnings": []}
    entries = engine.get_learnings(client_slug=client_slug, skill=skill, limit=limit)
    return {"client_slug": client_slug, "learnings": entries}


# ── Pattern Mining (Cross-Client Analysis) ─────────────────


@router.post("/patterns/mine")
async def mine_patterns(request: Request):
    """Run cross-client pattern mining on all feedback."""
    miner = getattr(request.app.state, "pattern_miner", None)
    if not miner:
        raise HTTPException(status_code=503, detail="Pattern miner not initialized")
    store = request.app.state.feedback_store
    result = miner.mine(store)
    return result


@router.get("/patterns/latest")
async def get_latest_patterns(request: Request):
    """Get the most recent pattern mining results."""
    miner = getattr(request.app.state, "pattern_miner", None)
    if not miner:
        return {"patterns": [], "last_run": 0}
    return miner.get_latest()


@router.get("/learnings/{client_slug}/digest")
async def get_learnings_digest(client_slug: str, request: Request):
    """Get a digest of feedback patterns for a client."""
    engine = getattr(request.app.state, "learning_engine", None)
    if not engine:
        return {"client_slug": client_slug, "total_learnings": 0, "by_skill": {}, "patterns": []}
    return engine.get_digest(client_slug=client_slug)


# ── Qualification Outcome (False Positive/Negative Tracking) ───


@router.post("/qualification-outcome")
async def record_qualification_outcome(request: Request):
    """Record the actual outcome of a company qualification for learning.

    Accepts: company_name, original_verdict (Y/N), actual_outcome
    (closed_won/closed_lost/disqualified), and optional notes.
    Feeds the learning engine to improve future qualification accuracy.
    """
    body = await request.json()
    company_name = body.get("company_name", "")
    original_verdict = body.get("original_verdict", "")
    actual_outcome = body.get("actual_outcome", "")
    notes = body.get("notes", "")
    client_slug = body.get("client_slug", "")

    if not company_name or not original_verdict or not actual_outcome:
        return {"error": True, "error_message": "company_name, original_verdict, and actual_outcome are required"}

    valid_outcomes = {"closed_won", "closed_lost", "disqualified"}
    if actual_outcome not in valid_outcomes:
        return {"error": True, "error_message": f"actual_outcome must be one of: {', '.join(valid_outcomes)}"}

    # Determine if this was a correct or incorrect qualification
    is_false_positive = original_verdict == "Y" and actual_outcome in ("closed_lost", "disqualified")
    is_false_negative = original_verdict == "N" and actual_outcome == "closed_won"
    is_correct = not is_false_positive and not is_false_negative

    # Feed into learning engine if incorrect
    learning = None
    learning_engine = getattr(request.app.state, "learning_engine", None)
    if learning_engine and (is_false_positive or is_false_negative):
        error_type = "false_positive" if is_false_positive else "false_negative"
        learning_note = (
            f"Qualification {error_type} for {company_name}: "
            f"predicted {original_verdict}, actual {actual_outcome}. {notes}"
        )
        try:
            learning = learning_engine.extract_learning(
                skill="company-qualifier",
                client_slug=client_slug,
                note=learning_note,
                rating="thumbs_down",
            )
        except Exception as e:
            logger.warning("[qualification-outcome] Learning extraction failed: %s", e)

    return {
        "ok": True,
        "company_name": company_name,
        "original_verdict": original_verdict,
        "actual_outcome": actual_outcome,
        "is_correct": is_correct,
        "is_false_positive": is_false_positive,
        "is_false_negative": is_false_negative,
        "learning_extracted": learning is not None,
    }
