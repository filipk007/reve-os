# Phase 1: Ollama Infrastructure - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Install Ollama on the existing VPS, pull a 7-8B model, configure as a systemd service, add a health check endpoint, and benchmark CPU inference speed. This is pure infrastructure — no scoring logic, no API endpoints beyond health.

</domain>

<decisions>
## Implementation Decisions

### Runtime
- **Ollama** — one-line install, runs as systemd service out of the box, REST API on port 11434, native structured JSON output (pass a schema, get valid JSON back)
- If stability issues crop up during long batch runs, fallback to raw `llama-server` (same llama.cpp engine, less wrapper overhead)
- Ollama chosen over LocalAI (overkill) and raw llama.cpp (more manual setup)

### VPS
- Run on **existing VPS** (178.156.249.201) alongside Clay Webhook OS
- Zero new infrastructure cost
- Benchmark first, upgrade to dedicated box (Hetzner AX42 ~$50/mo with DDR5) only if throughput is insufficient

### Model Selection
- **Deferred to benchmark results** — pull 1-3 models and compare
- Top candidates identified:
  - **Qwen2.5-7B-Instruct** (Q4_K_M) — best structured output compliance in 7B class, 4.5GB
  - **Phi-4-mini (3.8B)** — half the size, ~2x faster on CPU, but weaker at strict formatting
  - **Llama3.1:8b** — strong general reasoning, large community
  - **Qwen3-8B** — newer, native tool use, but less community testing
  - **Gemma2:9b** — solid instruction following, slightly larger
- Avoid Mistral-7B for this use case (weaker at structured classification)

### Network Binding
- **Deferred** — default to localhost-only (most secure), open up if needed

### Claude's Discretion
- Ollama systemd service configuration details (restart policy, memory limits)
- Exact benchmark methodology (prompt design, sample size)
- Whether to test parallel threads (`OLLAMA_NUM_PARALLEL`) during Phase 1 or defer to Phase 2

</decisions>

<specifics>
## Specific Ideas

- User wants to explore the full landscape of local open-source models before committing
- All research docs should be preserved for reference during model selection
- Cost is $0 marginal — the entire value prop is free inference at scale

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/routers/health.py` — existing health endpoint with deep check pattern (pings claude subprocess). Ollama health check should follow this same pattern.
- `scripts/deploy.sh` — uses `systemctl restart clay-webhook-os`. Ollama service management follows same systemd pattern.
- `app/main.py` — all state attached via `app.state`. Ollama client/config should follow this pattern.

### Established Patterns
- Health endpoint returns JSON with status, timestamps, subsystem checks
- Deep check pattern: lazy import, try/except, returns `claude_available: bool` + latency
- Background workers (retry, cleanup, subscription monitor) initialized at startup in `main.py`

### Integration Points
- New health check at `/health/ollama` or added to existing `/health` as `ollama` subsection
- Ollama client will be used by `icp_scorer.py` in Phase 2

</code_context>

<research>
## Research Findings (preserved for reference)

### Throughput Estimates (CPU, 8-core)

| Model | Speed | Per company | 10K companies (1 thread) | 10K (4 parallel) |
|-------|-------|------------|-------------------------|-------------------|
| 7B (qwen2.5) | ~10 tok/s | ~30-50s | 83-139 hrs | ~22-33 hrs |
| 3.8B (phi-4) | ~20 tok/s | ~15-25s | 42-69 hrs | ~11-17 hrs |

**Critical insight:** 10K companies in 12 hours requires parallelism (4+ threads) and/or smaller model. 1-2K companies fits easily even single-threaded.

### Ollama Configuration Reference

| Variable | Recommended | Why |
|----------|------------|-----|
| `OLLAMA_HOST` | `127.0.0.1:11434` | Localhost only, secure |
| `OLLAMA_NUM_PARALLEL` | `4` | 4 concurrent requests; RAM scales with parallelism |
| `OLLAMA_MAX_LOADED_MODELS` | `1` | Single model for scoring |
| `OLLAMA_KEEP_ALIVE` | `-1` | Never unload model (avoids memory leak on reload) |
| `OLLAMA_MAX_QUEUE` | `512` | Queue depth before 503 |
| `OLLAMA_CONTEXT_LENGTH` | `2048` | ICP prompts are short; halves context memory |

### Known Gotchas
1. **Memory leaks** — Ollama doesn't always free memory after model unload. Fix: `KEEP_ALIVE=-1` (never unload)
2. **CPU spin loops** — Can hit 100% CPU at context limits. Fix: set `num_ctx` well above prompt size
3. **Incomplete JSON** — Model can stop mid-JSON despite grammar constraints. Fix: Pydantic validation on every response
4. **Grammar overhead** — Structured output adds CPU overhead. Fix: keep JSON schema flat and simple
5. **Zombie processes** — Unloaded runners can persist. Fix: restart between batch runs

### VPS Upgrade Path (if needed)
- **Hetzner AX42**: AMD Ryzen 7 PRO 8700GE, 64GB DDR5, ~EUR 46/mo
- DDR5 gives ~1.5x memory bandwidth (the CPU inference bottleneck)
- Only needed if current VPS can't meet throughput requirements

### Runtime Comparison

| Runtime | Pros | Cons |
|---------|------|------|
| **Ollama** | One-line install, systemd built-in, model mgmt, REST API, JSON schema support | Wrapper overhead, known memory leaks |
| **llama.cpp server** | Fastest CPU inference, grammar-constrained output, no leaks | Manual setup, no model management |
| **LocalAI** | OpenAI-compatible API | Overkill for single-model batch scoring |

### What You Don't Need to Buy
- No Langfuse / LLM observability platform (v1)
- No vector DB
- No external API credits
- No GPU
- No additional VPS (start on current)

</research>

<deferred>
## Deferred Ideas

- Model A/B testing (score same companies with 2-3 models, compare) — do during benchmark step
- Hetzner AX42 upgrade — only if current VPS is too slow
- Langfuse self-hosted observability — v2+ if debugging individual scores becomes frequent
- Parallel thread tuning (`OLLAMA_NUM_PARALLEL`) — Phase 2 when we know actual batch sizes

</deferred>

---

*Phase: 01-ollama-infrastructure*
*Context gathered: 2026-03-11*
