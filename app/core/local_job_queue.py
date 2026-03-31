"""Local job queue — queues function execution jobs for pickup by local CLI runner.

Storage: data/local-jobs/{job_id}.json
Pattern: Same as execution_history — directory-based JSON, atomic writes.
"""

import json
import logging
import time
import uuid
from pathlib import Path

from app.core.atomic_writer import atomic_write_json

logger = logging.getLogger("clay-webhook-os")

MAX_PENDING_JOBS = 100
COMPLETED_RETENTION_HOURS = 24


class LocalJobQueue:
    """File-based queue for local execution jobs."""

    def __init__(self, data_dir: str | Path = "data"):
        self._base_dir = Path(data_dir) / "local-jobs"
        self._base_dir.mkdir(parents=True, exist_ok=True)

    def enqueue(self, job: dict) -> str:
        """Queue a new job. Returns the job ID."""
        job_id = job.get("id") or f"job_{uuid.uuid4().hex[:12]}"
        job["id"] = job_id
        job.setdefault("status", "pending")
        job.setdefault("queued_at", time.time())

        path = self._base_dir / f"{job_id}.json"
        try:
            atomic_write_json(path, job)
            self._prune_completed()
            logger.info("[local_job_queue] Enqueued %s for function %s", job_id, job.get("function_id"))
        except Exception as e:
            logger.warning("[local_job_queue] Failed to enqueue %s: %s", job_id, e)
        return job_id

    def get(self, job_id: str) -> dict | None:
        """Get a single job by ID."""
        path = self._base_dir / f"{job_id}.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("[local_job_queue] Failed to read %s: %s", path, e)
            return None

    def list_pending(self, limit: int = 20) -> list[dict]:
        """List pending jobs, oldest first (FIFO)."""
        jobs = []
        for path in sorted(self._base_dir.glob("*.json"), key=lambda f: f.stat().st_mtime):
            try:
                job = json.loads(path.read_text())
                if job.get("status") == "pending":
                    jobs.append(job)
                    if len(jobs) >= limit:
                        break
            except (json.JSONDecodeError, OSError):
                continue
        return jobs

    def list_all(self, limit: int = 50) -> list[dict]:
        """List all jobs, newest first."""
        jobs = []
        for path in sorted(self._base_dir.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True):
            try:
                jobs.append(json.loads(path.read_text()))
                if len(jobs) >= limit:
                    break
            except (json.JSONDecodeError, OSError):
                continue
        return jobs

    def update_status(self, job_id: str, status: str, extras: dict | None = None) -> dict | None:
        """Update job status. Returns updated job or None."""
        path = self._base_dir / f"{job_id}.json"
        if not path.exists():
            return None
        try:
            job = json.loads(path.read_text())
            job["status"] = status
            job[f"{status}_at"] = time.time()
            if extras:
                job.update(extras)
            atomic_write_json(path, job)
            logger.info("[local_job_queue] Updated %s → %s", job_id, status)
            return job
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("[local_job_queue] Failed to update %s: %s", job_id, e)
            return None

    def _prune_completed(self) -> None:
        """Remove completed/failed jobs older than retention period."""
        cutoff = time.time() - (COMPLETED_RETENTION_HOURS * 3600)
        for path in self._base_dir.glob("*.json"):
            try:
                job = json.loads(path.read_text())
                if job.get("status") in ("completed", "failed"):
                    completed_at = job.get("completed_at") or job.get("failed_at") or 0
                    if completed_at < cutoff:
                        path.unlink()
                        logger.info("[local_job_queue] Pruned old job %s", path.name)
            except (json.JSONDecodeError, OSError):
                continue
