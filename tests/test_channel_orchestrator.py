"""Tests for ChannelOrchestrator -- function execution bridge for chat."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.channel_orchestrator import ChannelOrchestrator
from app.models.functions import (
    FunctionDefinition,
    FunctionInput,
    FunctionOutput,
    FunctionStep,
)


def _make_function(**kwargs) -> FunctionDefinition:
    """Create a FunctionDefinition with sensible defaults."""
    defaults = dict(
        id="test-func",
        name="Test Function",
        description="A test function",
        inputs=[FunctionInput(name="company_name", type="string", required=True)],
        outputs=[FunctionOutput(key="domain", type="string")],
        steps=[FunctionStep(tool="skill:company-research", params={"company": "{{company_name}}"})],
    )
    defaults.update(kwargs)
    return FunctionDefinition(**defaults)


def _make_orchestrator(
    func: FunctionDefinition | None = None,
    pool_result: dict | None = None,
) -> ChannelOrchestrator:
    """Create an orchestrator with mocked dependencies."""
    function_store = MagicMock()
    if func is not None:
        function_store.get.return_value = func
    else:
        function_store.get.return_value = None

    pool = AsyncMock()
    pool.submit.return_value = pool_result or {"result": json.dumps({"domain": "example.com"})}

    return ChannelOrchestrator(function_store=function_store, pool=pool)


async def _collect_events(orchestrator, function_id, data_rows, instructions=None):
    """Collect all events from execute_message into a list."""
    events = []
    async for event_type, payload in orchestrator.execute_message(
        function_id, data_rows, instructions=instructions
    ):
        events.append((event_type, payload))
    return events


# ── Test 1: Function not found ─────────────────────────


async def test_function_not_found():
    """Yields error event when function_id is invalid."""
    orchestrator = _make_orchestrator(func=None)

    events = await _collect_events(orchestrator, "nonexistent", [{"company_name": "Acme"}])

    assert len(events) == 1
    event_type, payload = events[0]
    assert event_type == "error"
    assert payload["error"] is True
    assert "nonexistent" in payload["error_message"]


# ── Test 2: Single row success ─────────────────────────


async def test_single_row_success():
    """Single row yields function_started, row_processing, row_complete, function_complete in order."""
    func = _make_function()
    orchestrator = _make_orchestrator(func=func)

    events = await _collect_events(orchestrator, "test-func", [{"company_name": "Acme"}])

    event_types = [e[0] for e in events]
    assert event_types == ["function_started", "row_processing", "row_complete", "function_complete"]


# ── Test 3: Single row event payloads ──────────────────


async def test_single_row_event_payloads():
    """Verify exact payload shapes for each event type."""
    func = _make_function()
    orchestrator = _make_orchestrator(func=func)

    events = await _collect_events(orchestrator, "test-func", [{"company_name": "Acme"}])

    # function_started
    _, started = events[0]
    assert started["function_id"] == "test-func"
    assert started["function_name"] == "Test Function"
    assert started["total_rows"] == 1

    # row_processing
    _, processing = events[1]
    assert processing["row_index"] == 0
    assert processing["total_rows"] == 1
    assert processing["status"] == "Processing 1/1"

    # row_complete
    _, complete = events[2]
    assert complete["row_index"] == 0
    assert complete["total_rows"] == 1
    assert "result" in complete

    # function_complete
    _, func_complete = events[3]
    assert func_complete["function_id"] == "test-func"
    assert func_complete["total_rows"] == 1
    assert func_complete["completed"] == 1
    assert func_complete["failed"] == 0
    assert isinstance(func_complete["results"], list)
    assert len(func_complete["results"]) == 1


# ── Test 4: Batch three rows ──────────────────────────


async def test_batch_three_rows():
    """3 rows yield 3x (row_processing + row_complete) between function_started and function_complete."""
    func = _make_function()
    orchestrator = _make_orchestrator(func=func)

    data_rows = [
        {"company_name": "Acme"},
        {"company_name": "Globex"},
        {"company_name": "Initech"},
    ]
    events = await _collect_events(orchestrator, "test-func", data_rows)

    event_types = [e[0] for e in events]
    assert event_types == [
        "function_started",
        "row_processing", "row_complete",
        "row_processing", "row_complete",
        "row_processing", "row_complete",
        "function_complete",
    ]


# ── Test 5: Batch with failure ─────────────────────────


async def test_batch_with_failure():
    """Mock pool.submit to raise on 2nd row, verify row_error event and remaining rows still process."""
    func = _make_function()
    orchestrator = _make_orchestrator(func=func)

    # Make pool.submit fail on second call only
    call_count = 0
    original_result = {"result": json.dumps({"domain": "example.com"})}

    async def side_effect(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            raise RuntimeError("AI execution failed")
        return original_result

    orchestrator._pool.submit.side_effect = side_effect

    data_rows = [
        {"company_name": "Acme"},
        {"company_name": "BadCo"},
        {"company_name": "Initech"},
    ]
    events = await _collect_events(orchestrator, "test-func", data_rows)

    event_types = [e[0] for e in events]
    assert event_types == [
        "function_started",
        "row_processing", "row_complete",     # row 0: success
        "row_processing", "row_error",         # row 1: failure
        "row_processing", "row_complete",      # row 2: success (continues after failure)
        "function_complete",
    ]

    # Verify row_error payload
    error_events = [(t, p) for t, p in events if t == "row_error"]
    assert len(error_events) == 1
    _, error_payload = error_events[0]
    assert error_payload["row_index"] == 1
    assert "AI execution failed" in error_payload["error"]


# ── Test 6: Function complete counts ───────────────────


async def test_function_complete_counts():
    """Verify completed and failed counts in function_complete payload."""
    func = _make_function()
    orchestrator = _make_orchestrator(func=func)

    # Fail on 2nd call
    call_count = 0

    async def side_effect(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            raise RuntimeError("boom")
        return {"result": json.dumps({"domain": "example.com"})}

    orchestrator._pool.submit.side_effect = side_effect

    data_rows = [
        {"company_name": "A"},
        {"company_name": "B"},
        {"company_name": "C"},
    ]
    events = await _collect_events(orchestrator, "test-func", data_rows)

    _, func_complete = events[-1]
    assert func_complete["completed"] == 2
    assert func_complete["failed"] == 1
    assert func_complete["total_rows"] == 3


# ── Test 7: Skill step execution ──────────────────────


async def test_skill_step_execution():
    """Verify load_skill, build_prompt, resolve_model, pool.submit called correctly for skill:xxx step."""
    func = _make_function(
        steps=[FunctionStep(tool="skill:email-gen", params={"company": "{{company_name}}"})],
    )
    orchestrator = _make_orchestrator(func=func)

    with patch("app.core.channel_orchestrator.load_skill", return_value="Skill body content") as mock_load_skill, \
         patch("app.core.channel_orchestrator.load_skill_config", return_value={"model_tier": "standard"}) as mock_config, \
         patch("app.core.channel_orchestrator.build_prompt", return_value="full prompt text") as mock_build_prompt, \
         patch("app.core.channel_orchestrator.resolve_model", return_value="sonnet") as mock_resolve:

        await _collect_events(orchestrator, "test-func", [{"company_name": "Acme"}])

        mock_load_skill.assert_called_once_with("email-gen")
        mock_config.assert_called_once_with("email-gen")
        mock_resolve.assert_called_once_with(request_model=None, skill_config={"model_tier": "standard"})
        mock_build_prompt.assert_called_once()

        # Verify pool.submit was called with the built prompt and resolved model
        orchestrator._pool.submit.assert_called_once()
        call_args = orchestrator._pool.submit.call_args
        assert call_args[0][0] == "full prompt text"  # prompt
        assert call_args[0][1] == "sonnet"  # model


# ── Test 8: call_ai step ──────────────────────────────


async def test_call_ai_step():
    """Verify call_ai step builds prompt and submits."""
    func = _make_function(
        steps=[FunctionStep(tool="call_ai", params={"prompt": "Analyze {{company_name}}", "model": "opus"})],
    )
    orchestrator = _make_orchestrator(func=func)

    await _collect_events(orchestrator, "test-func", [{"company_name": "Acme"}])

    # Should have called pool.submit
    orchestrator._pool.submit.assert_called_once()
    call_args = orchestrator._pool.submit.call_args
    prompt = call_args[0][0]
    assert "Analyze Acme" in prompt
    assert "Return valid JSON" in prompt


# ── Test 9: Param resolution ─────────────────────────


async def test_param_resolution():
    """Verify {{placeholder}} replacement in step params."""
    func = _make_function(
        inputs=[
            FunctionInput(name="company_name"),
            FunctionInput(name="domain"),
        ],
        steps=[FunctionStep(tool="call_ai", params={
            "prompt": "Research {{company_name}} at {{domain}}",
        })],
    )
    orchestrator = _make_orchestrator(func=func)

    await _collect_events(
        orchestrator, "test-func",
        [{"company_name": "Acme", "domain": "acme.com"}],
    )

    orchestrator._pool.submit.assert_called_once()
    prompt = orchestrator._pool.submit.call_args[0][0]
    assert "Research Acme at acme.com" in prompt


# ── Test 10: Accumulated output ──────────────────────


async def test_accumulated_output():
    """Verify step outputs chain into next step's inputs."""
    func = _make_function(
        outputs=[
            FunctionOutput(key="domain"),
            FunctionOutput(key="summary"),
        ],
        steps=[
            FunctionStep(tool="call_ai", params={"prompt": "Find domain for {{company_name}}"}),
            FunctionStep(tool="call_ai", params={"prompt": "Summarize {{domain}}"}),
        ],
    )

    # First call returns domain, second call returns summary
    call_count = 0

    async def side_effect(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return {"result": json.dumps({"domain": "acme.com"})}
        return {"result": json.dumps({"summary": "Acme is a company"})}

    function_store = MagicMock()
    function_store.get.return_value = func
    pool = AsyncMock()
    pool.submit.side_effect = side_effect

    orchestrator = ChannelOrchestrator(function_store=function_store, pool=pool)

    events = await _collect_events(orchestrator, "test-func", [{"company_name": "Acme"}])

    # Second call should have {{domain}} resolved to "acme.com"
    second_call_prompt = pool.submit.call_args_list[1][0][0]
    assert "acme.com" in second_call_prompt

    # row_complete result should have both keys
    row_complete_events = [(t, p) for t, p in events if t == "row_complete"]
    assert len(row_complete_events) == 1
    result = row_complete_events[0][1]["result"]
    assert "domain" in result
    assert "summary" in result
