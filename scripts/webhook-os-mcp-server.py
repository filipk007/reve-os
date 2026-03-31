#!/usr/bin/env python3
"""Webhook OS MCP Server — Natural language function execution from Claude Code.

A stdio-based MCP server that lets you run Clay Webhook OS functions directly
from any Claude Code session via MCP tools.

Usage in .mcp.json:
{
  "mcpServers": {
    "webhook-os": {
      "type": "stdio",
      "command": "/opt/homebrew/bin/python3.11",
      "args": ["scripts/webhook-os-mcp-server.py"],
      "env": {
        "CLAY_API_URL": "https://clay.nomynoms.com",
        "WEBHOOK_API_KEY": "your-webhook-api-key"
      }
    }
  }
}

Then in Claude Code:
  "Run the email-gen function for Acme Corp"
  "What functions are available?"
  "Search the knowledge base for fintech"
"""

import json
import os
import sys
from typing import Any

try:
    import requests
except ImportError:
    sys.stderr.write("Error: 'requests' package required. Run: pip install requests\n")
    sys.exit(1)


# ── Config ────────────────────────────────────────────────

API_URL = os.environ.get("CLAY_API_URL", "https://clay.nomynoms.com")
API_KEY = os.environ.get("WEBHOOK_API_KEY", "")
HEADERS = {"x-api-key": API_KEY, "Content-Type": "application/json"}


# ── API Helpers ───────────────────────────────────────────

def api_get(path: str) -> dict:
    r = requests.get(f"{API_URL}{path}", headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()


def api_post(path: str, body: dict) -> dict:
    r = requests.post(f"{API_URL}{path}", headers=HEADERS, json=body, timeout=60)
    r.raise_for_status()
    return r.json()


# ── Tool Implementations ─────────────────────────────────

def tool_list_functions(_args: dict) -> str:
    """List all available functions with their IDs, names, and schemas."""
    data = api_get("/functions")
    functions = data.get("functions", data) if isinstance(data, dict) else data

    lines = [f"Available Functions ({len(functions)}):\n"]
    for func in functions:
        fid = func.get("id", "?")
        name = func.get("name", "Untitled")
        desc = func.get("description", "")
        inputs = [i.get("name") for i in func.get("inputs", [])]
        outputs = [o.get("key") for o in func.get("outputs", [])]
        lines.append(f"  {fid}: {name}")
        if desc:
            lines.append(f"    Description: {desc}")
        if inputs:
            lines.append(f"    Inputs: {', '.join(inputs)}")
        if outputs:
            lines.append(f"    Outputs: {', '.join(outputs)}")
        lines.append("")

    return "\n".join(lines)


def tool_get_function(args: dict) -> str:
    """Get full details of a function including steps and schemas."""
    func_id = args.get("function_id", "")
    if not func_id:
        return "Error: function_id is required"

    func = api_get(f"/functions/{func_id}")
    return json.dumps(func, indent=2)


def tool_run_function(args: dict) -> str:
    """Prepare a function for execution: assembles the prompt with all context.

    Returns the assembled prompt that Claude should follow to generate the output.
    After generating the output, use submit_result to save it.
    """
    func_id = args.get("function_id", "")
    data = args.get("data", {})
    instructions = args.get("instructions")
    model = args.get("model")

    if not func_id:
        return "Error: function_id is required"

    body: dict = {"data": data}
    if instructions:
        body["instructions"] = instructions
    if model:
        body["model"] = model

    result = api_post(f"/functions/{func_id}/queue-local", body)

    job_id = result.get("job_id", "")
    prompt = result.get("prompt", "")
    output_keys = result.get("output_keys", [])
    native_results = result.get("native_results", {})

    response_parts = [
        f"Job ID: {job_id}",
        f"Function: {result.get('function_name', func_id)}",
        f"Model: {result.get('model', 'sonnet')}",
        f"Expected outputs: {', '.join(output_keys)}",
    ]

    if native_results:
        response_parts.append(f"\nPre-fetched data from native APIs:")
        response_parts.append(json.dumps(native_results, indent=2))

    response_parts.append(f"\n{'='*60}")
    response_parts.append("INSTRUCTIONS: Follow the prompt below to generate the output.")
    response_parts.append(f"Output MUST be a JSON object with these keys: {', '.join(output_keys)}")
    response_parts.append(f"After generating output, use submit_result with job_id='{job_id}'")
    response_parts.append(f"{'='*60}\n")
    response_parts.append(prompt)

    return "\n".join(response_parts)


def tool_submit_result(args: dict) -> str:
    """Submit the generated result back to the server for storage."""
    func_id = args.get("function_id", "")
    job_id = args.get("job_id", "")
    result = args.get("result", {})

    if not func_id or not job_id:
        return "Error: function_id and job_id are required"

    body = {"job_id": job_id, "result": result}
    response = api_post(f"/functions/{func_id}/submit-result", body)

    return json.dumps({
        "status": "saved",
        "exec_id": response.get("exec_id"),
        "warnings": response.get("warnings", []),
    }, indent=2)


def tool_search_knowledge_base(args: dict) -> str:
    """Search the knowledge base for relevant context files."""
    query = args.get("query", "")
    if not query:
        return "Error: query is required"

    try:
        data = api_get(f"/context/search?q={requests.utils.quote(query)}&limit=5")
        results = data.get("results", [])
        if not results:
            return f"No knowledge base results for '{query}'"

        lines = [f"Knowledge Base Results for '{query}':\n"]
        for r in results:
            lines.append(f"  {r.get('path', '?')} (score: {r.get('score', 0):.2f})")
            if r.get("snippet"):
                lines.append(f"    {r['snippet'][:200]}")
            lines.append("")
        return "\n".join(lines)
    except Exception as e:
        return f"Search failed: {e}"


def tool_list_clients(_args: dict) -> str:
    """List available client profiles."""
    try:
        data = api_get("/context/clients")
        clients = data.get("clients", [])
        if not clients:
            return "No client profiles found."

        lines = [f"Client Profiles ({len(clients)}):\n"]
        for c in clients:
            slug = c.get("slug", "?")
            name = c.get("name", slug)
            lines.append(f"  {slug}: {name}")
        return "\n".join(lines)
    except Exception as e:
        return f"Failed to list clients: {e}"


# ── MCP Protocol ──────────────────────────────────────────

TOOLS = [
    {
        "name": "list_functions",
        "description": "List all available Clay functions with their IDs, inputs, and outputs. Use this to discover what functions you can run.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "get_function",
        "description": "Get full details of a specific function including steps, inputs, outputs, and configuration.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "function_id": {
                    "type": "string",
                    "description": "The function ID (e.g., 'func-email-gen')",
                },
            },
            "required": ["function_id"],
        },
    },
    {
        "name": "run_function",
        "description": "Prepare and run a Clay function. Returns the assembled prompt with all context, skill instructions, and knowledge base. Follow the prompt instructions to generate the output, then use submit_result to save it.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "function_id": {
                    "type": "string",
                    "description": "The function ID to execute",
                },
                "data": {
                    "type": "object",
                    "description": "Input data for the function (e.g., {company: 'Acme', domain: 'acme.com'})",
                },
                "instructions": {
                    "type": "string",
                    "description": "Optional campaign-specific instructions",
                },
                "model": {
                    "type": "string",
                    "description": "Model override: opus, sonnet, or haiku",
                },
            },
            "required": ["function_id", "data"],
        },
    },
    {
        "name": "submit_result",
        "description": "Submit the generated result back to the Clay server for storage in execution history. Use after generating output from run_function.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "function_id": {
                    "type": "string",
                    "description": "The function ID",
                },
                "job_id": {
                    "type": "string",
                    "description": "The job ID from run_function",
                },
                "result": {
                    "type": "object",
                    "description": "The generated JSON output",
                },
            },
            "required": ["function_id", "job_id", "result"],
        },
    },
    {
        "name": "search_knowledge_base",
        "description": "Search the Clay knowledge base for relevant context files. Useful for understanding what client profiles, frameworks, and industry context is available.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query (e.g., 'fintech', 'objection handling', 'competitor research')",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "list_clients",
        "description": "List all available client profiles. Each client has a profile with value prop, ICP, differentiators, and tone preferences.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
]

TOOL_HANDLERS = {
    "list_functions": tool_list_functions,
    "get_function": tool_get_function,
    "run_function": tool_run_function,
    "submit_result": tool_submit_result,
    "search_knowledge_base": tool_search_knowledge_base,
    "list_clients": tool_list_clients,
}


def handle_request(request: dict) -> dict:
    """Process a single JSON-RPC request."""
    method = request.get("method", "")
    req_id = request.get("id")
    params = request.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {
                    "name": "clay-webhook-os",
                    "version": "1.0.0",
                },
            },
        }

    if method == "notifications/initialized":
        return None  # No response needed for notifications

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": TOOLS},
        }

    if method == "tools/call":
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})
        handler = TOOL_HANDLERS.get(tool_name)

        if not handler:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": f"Unknown tool: {tool_name}"}],
                    "isError": True,
                },
            }

        try:
            result_text = handler(arguments)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": result_text}],
                },
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": f"Error: {e}"}],
                    "isError": True,
                },
            }

    # Unknown method
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    }


def main():
    """Run the MCP server on stdio."""
    if not API_KEY:
        sys.stderr.write("Warning: WEBHOOK_API_KEY not set. API calls will fail.\n")

    sys.stderr.write(f"Webhook OS MCP Server started — {API_URL}\n")

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            sys.stderr.write(f"Invalid JSON: {line[:100]}\n")
            continue

        response = handle_request(request)
        if response is not None:
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
