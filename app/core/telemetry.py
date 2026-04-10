"""OpenTelemetry / Arize Phoenix integration for LLM observability.

No-op unless PHOENIX_ENABLED=1 in the environment and the telemetry extras
are installed (`pip install -e .[telemetry]`). Traces export via OTLP to a
self-hosted Phoenix (default: http://localhost:6006).

Usage:
    from app.core.telemetry import init_telemetry, skill_span, record_llm_response

    init_telemetry()  # called once in main.py startup()

    with skill_span(skill="classify", model="sonnet", prompt=prompt) as span:
        result = await executor.execute(...)
        record_llm_response(span, result["result"], result["duration_ms"])
"""

import logging
import os
from contextlib import contextmanager
from typing import Any, Iterator

logger = logging.getLogger("clay-webhook-os")

_tracer: Any = None
_enabled = False


def init_telemetry(project_name: str = "clay-webhook-os") -> bool:
    """Initialize Phoenix tracing. Returns True if enabled.

    Safe to call multiple times — second call is a no-op. Safe to call
    when deps aren't installed — logs and returns False.
    """
    global _tracer, _enabled
    if _enabled:
        return True

    flag = os.getenv("PHOENIX_ENABLED", "").strip().lower()
    if flag not in ("1", "true", "yes", "on"):
        logger.info("[telemetry] Phoenix disabled (set PHOENIX_ENABLED=1 to enable)")
        return False

    try:
        from phoenix.otel import register
    except ImportError as e:
        logger.warning(
            "[telemetry] Phoenix deps not installed (%s). "
            "Run: pip install -e '.[telemetry]'",
            e,
        )
        return False

    endpoint = os.getenv("PHOENIX_ENDPOINT", "http://localhost:6006/v1/traces")
    try:
        tracer_provider = register(
            project_name=project_name,
            endpoint=endpoint,
            auto_instrument=False,
        )
        _tracer = tracer_provider.get_tracer("clay-webhook-os")
        _enabled = True
        logger.info("[telemetry] Phoenix enabled → %s (project=%s)", endpoint, project_name)
        return True
    except Exception as e:
        logger.warning("[telemetry] Phoenix init failed: %s", e)
        _tracer = None
        _enabled = False
        return False


def is_enabled() -> bool:
    return _enabled


@contextmanager
def skill_span(
    skill: str | None = None,
    model: str = "",
    prompt: str | None = None,
    executor: str = "claude",
    extra: dict[str, Any] | None = None,
) -> Iterator[Any]:
    """Trace a single skill execution. Yields the span (or None if disabled).

    All span attributes use OpenInference semantic conventions so Phoenix
    recognizes this as an LLM span and renders it correctly.
    """
    if not _enabled or _tracer is None:
        yield None
        return

    name = f"skill.{skill}" if skill else f"llm.{executor}"
    with _tracer.start_as_current_span(name) as span:
        try:
            span.set_attribute("openinference.span.kind", "LLM")
            span.set_attribute("llm.provider", "anthropic")
            span.set_attribute("llm.system", "claude")
            if skill:
                span.set_attribute("llm.skill", skill)
            if model:
                span.set_attribute("llm.model_name", model)
            span.set_attribute("llm.executor", executor)
            if prompt is not None:
                # Phoenix truncates long values itself, but cap here to keep spans small.
                span.set_attribute("llm.input_messages.0.message.role", "user")
                span.set_attribute(
                    "llm.input_messages.0.message.content",
                    prompt[:16000],
                )
                span.set_attribute("input.value", prompt[:16000])
                span.set_attribute("llm.prompt.chars", len(prompt))
            if extra:
                for k, v in extra.items():
                    span.set_attribute(k, v)
        except Exception as e:
            logger.debug("[telemetry] span attribute set failed: %s", e)
        yield span


def record_llm_response(
    span: Any,
    response: Any,
    duration_ms: int | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
) -> None:
    """Attach the LLM response to a span. No-op if span is None."""
    if span is None:
        return
    try:
        text = response if isinstance(response, str) else str(response)
        span.set_attribute("llm.output_messages.0.message.role", "assistant")
        span.set_attribute("llm.output_messages.0.message.content", text[:16000])
        span.set_attribute("output.value", text[:16000])
        span.set_attribute("llm.response.chars", len(text))
        if duration_ms is not None:
            span.set_attribute("llm.duration_ms", duration_ms)
        if prompt_tokens is not None:
            span.set_attribute("llm.token_count.prompt", prompt_tokens)
        if completion_tokens is not None:
            span.set_attribute("llm.token_count.completion", completion_tokens)
        if prompt_tokens is not None and completion_tokens is not None:
            span.set_attribute(
                "llm.token_count.total", prompt_tokens + completion_tokens
            )
    except Exception as e:
        logger.debug("[telemetry] record_llm_response failed: %s", e)


def record_llm_error(span: Any, error: Exception) -> None:
    """Mark a span as errored. No-op if span is None."""
    if span is None:
        return
    try:
        span.set_attribute("llm.error", True)
        span.set_attribute("error.type", type(error).__name__)
        span.set_attribute("error.message", str(error)[:1000])
        span.record_exception(error)
        # OpenTelemetry StatusCode.ERROR = 2 — set without importing the enum
        # to keep this module decoupled from opentelemetry at import time.
        try:
            from opentelemetry.trace.status import Status, StatusCode
            span.set_status(Status(StatusCode.ERROR, str(error)[:500]))
        except Exception:
            pass
    except Exception as e:
        logger.debug("[telemetry] record_llm_error failed: %s", e)


@contextmanager
def worker_span(job_id: str, skill: str | None = None) -> Iterator[Any]:
    """Parent span for a worker job. Yields span or None."""
    if not _enabled or _tracer is None:
        yield None
        return
    name = f"worker.job.{skill}" if skill else "worker.job"
    with _tracer.start_as_current_span(name) as span:
        try:
            span.set_attribute("openinference.span.kind", "CHAIN")
            span.set_attribute("worker.job_id", job_id)
            if skill:
                span.set_attribute("worker.skill", skill)
        except Exception:
            pass
        yield span
