"""ChannelOrchestrator -- function execution bridge for chat.

Receives a message with data rows and function_id, executes the function steps,
and yields SSE event tuples. No dependency on FastAPI Request -- receives its
dependencies via constructor (function_store, pool).
"""

import json
import logging
from typing import AsyncGenerator

from app.core.context_assembler import build_prompt
from app.core.model_router import resolve_model
from app.core.skill_loader import load_skill, load_skill_config
from app.routers.webhook import _flatten_to_expected_keys, _get_tool_meta, _parse_ai_json

logger = logging.getLogger("clay-webhook-os")


class ChannelOrchestrator:
    """Bridges chat messages to function execution with SSE event streaming."""

    def __init__(self, function_store, pool):
        """
        Args:
            function_store: FunctionStore instance for loading function definitions.
            pool: WorkerPool instance for AI execution.
        """
        self._function_store = function_store
        self._pool = pool

    async def execute_message(
        self,
        function_id: str,
        data_rows: list[dict],
        instructions: str | None = None,
    ) -> AsyncGenerator[tuple[str, dict], None]:
        """Execute a function against data rows, yielding SSE event tuples.

        Yields (event_type, payload) tuples:
        - ("function_started", {...})
        - ("row_processing", {...})
        - ("row_complete", {...})
        - ("row_error", {...})
        - ("function_complete", {...})
        - ("error", {...}) on fatal errors
        """
        func = self._function_store.get(function_id)
        if func is None:
            yield ("error", {
                "error": True,
                "error_message": f"Function '{function_id}' not found",
            })
            return

        total = len(data_rows)
        yield ("function_started", {
            "function_id": function_id,
            "function_name": func.name,
            "total_rows": total,
        })

        results: list[dict] = []
        failed_count = 0

        for idx, row_data in enumerate(data_rows):
            yield ("row_processing", {
                "row_index": idx,
                "total_rows": total,
                "status": f"Processing {idx + 1}/{total}",
            })

            try:
                row_result = await self._execute_single_row(func, row_data, instructions)
                results.append(row_result)
                yield ("row_complete", {
                    "row_index": idx,
                    "total_rows": total,
                    "result": row_result,
                })
            except Exception as e:
                failed_count += 1
                logger.warning(
                    "[channel-orchestrator] Row %d failed: %s", idx, str(e),
                )
                yield ("row_error", {
                    "row_index": idx,
                    "total_rows": total,
                    "error": str(e),
                })

        yield ("function_complete", {
            "function_id": function_id,
            "total_rows": total,
            "completed": len(results),
            "failed": failed_count,
            "results": results,
        })

    async def _execute_single_row(
        self,
        func,
        row_data: dict,
        instructions: str | None = None,
    ) -> dict:
        """Execute all function steps for a single data row.

        Returns the accumulated output filtered to function output keys.
        """
        accumulated_output: dict = {}

        for step_idx, step in enumerate(func.steps):
            # Resolve params: replace {{input_name}} placeholders
            resolved_params = {}
            for key, val in step.params.items():
                resolved = val
                for inp_name, inp_val in {**row_data, **accumulated_output}.items():
                    resolved = resolved.replace(
                        "{{" + str(inp_name) + "}}", str(inp_val),
                    )
                resolved_params[key] = resolved

            # Route by step type
            parsed = await self._execute_step(
                step, resolved_params, row_data, accumulated_output, func, instructions,
            )

            # Merge parsed result into accumulated_output
            if parsed and isinstance(parsed, dict):
                flattened = _flatten_to_expected_keys(
                    parsed, [o.key for o in func.outputs],
                )
                accumulated_output.update(parsed)
                accumulated_output.update(flattened)

        # Filter to only include expected output keys
        if func.outputs:
            return {
                o.key: accumulated_output.get(o.key)
                for o in func.outputs
                if o.key in accumulated_output
            }
        # If no outputs defined, return all non-internal keys
        return {
            k: v for k, v in accumulated_output.items()
            if not k.startswith("_step_")
        }

    async def _execute_step(
        self,
        step,
        resolved_params: dict,
        row_data: dict,
        accumulated_output: dict,
        func,
        instructions: str | None,
    ) -> dict:
        """Execute a single function step and return parsed result."""
        tool_id = step.tool

        if tool_id.startswith("skill:"):
            return await self._execute_skill_step(
                tool_id, resolved_params, row_data, accumulated_output, func, instructions,
            )
        elif tool_id == "call_ai":
            return await self._execute_call_ai_step(
                resolved_params, row_data, accumulated_output,
            )
        else:
            return await self._execute_deepline_step(
                tool_id, step, resolved_params, row_data, accumulated_output,
            )

    async def _execute_skill_step(
        self,
        tool_id: str,
        resolved_params: dict,
        row_data: dict,
        accumulated_output: dict,
        func,
        instructions: str | None,
    ) -> dict:
        """Execute a skill:xxx step."""
        skill_name = tool_id.removeprefix("skill:")
        skill_content = load_skill(skill_name)
        if skill_content is None:
            raise ValueError(f"Skill '{skill_name}' not found")

        config = load_skill_config(skill_name)
        model = resolve_model(request_model=None, skill_config=config)
        merged_data = {**row_data, **accumulated_output, **resolved_params}
        prompt = build_prompt(
            skill_content=skill_content,
            context_files=[],
            data=merged_data,
            instructions=instructions,
        )
        result = await self._pool.submit(prompt, model, timeout=120)
        return _parse_ai_json(result.get("result", ""))

    async def _execute_call_ai_step(
        self,
        resolved_params: dict,
        row_data: dict,
        accumulated_output: dict,
    ) -> dict:
        """Execute a call_ai step."""
        ai_prompt = resolved_params.get("prompt", "Analyze this data")
        merged_data = {**row_data, **accumulated_output, **resolved_params}
        full_prompt = (
            f"{ai_prompt}\n\n"
            f"Data:\n{json.dumps(merged_data, indent=2)}\n\n"
            f"Return valid JSON."
        )
        model = resolved_params.get("model", "sonnet")
        result = await self._pool.submit(full_prompt, model, timeout=120)
        return _parse_ai_json(result.get("result", ""))

    async def _execute_deepline_step(
        self,
        tool_id: str,
        step,
        resolved_params: dict,
        row_data: dict,
        accumulated_output: dict,
    ) -> dict:
        """Execute a Deepline tool step via AI agent fallback."""
        tool_meta = _get_tool_meta(tool_id)
        if tool_meta is None:
            logger.warning(
                "[channel-orchestrator] Unknown tool: %s", tool_id,
            )
            return {"_step_error": f"Unknown tool: {tool_id}"}

        tool_prompt = (
            f"Use the {tool_meta.get('name', tool_id)} tool.\n"
            f"Data: {json.dumps({**row_data, **accumulated_output, **resolved_params})}\n"
            f"Return JSON."
        )
        result = await self._pool.submit(
            tool_prompt, "sonnet", timeout=120,
            executor_type="agent", max_turns=3,
            allowed_tools=["web_search", "web_fetch"],
        )
        return _parse_ai_json(result.get("result", ""))
