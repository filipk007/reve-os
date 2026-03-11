# Batch ICP Scorer

## What This Is

A batch company qualification endpoint for Clay Webhook OS that takes a CSV of raw companies (name, domain, description) and scores each one against a client's ICP using a local LLM (Ollama, 7-8B model on CPU). The "cheap filter before you spend money on enrichment" pattern — score thousands of companies for $0, then only enrich the ones that pass. Designed to run unattended for 12+ hours on the existing VPS.

## Core Value

Score thousands of companies against any client's ICP criteria at zero marginal cost, so users only spend enrichment budget on pre-qualified accounts.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] API endpoint `POST /batch-icp-score` accepts CSV upload (columns: company_name, domain, description)
- [ ] Each company scored on 2 client-configurable dimensions (1-5 scale each)
- [ ] Client ICP scoring config stored in client profile (dimensions, thresholds, prompt template)
- [ ] Scoring uses Ollama with a 7-8B model running on VPS CPU
- [ ] Async job queue — upload returns job ID, poll for results
- [ ] Scored CSV returned with original columns + score columns + reason + pass/fail
- [ ] 12 Labs ICP config as first client implementation (Video Intensity + Technical Builder)
- [ ] Dashboard page to upload CSV, monitor job progress, download results
- [ ] Job persistence — survives server restart, resumes where it left off

### Out of Scope

- GPU acceleration — CPU-only for cost reasons
- Real-time scoring — batch/async only, designed for overnight runs
- Contact enrichment — this scores companies only, enrichment is a separate downstream step
- OpenAI/Anthropic API fallback — local model only, zero external API costs
- Models larger than 8B — VPS has no GPU, must run on CPU in reasonable time

## Context

- **Origin:** SmartLead webinar insight — Eric Nowackowski described pulling every company in a TAM, then using batch AI to qualify cheaply. We're implementing this pattern for Webhook OS clients.
- **First client:** 12 Labs (AI video understanding company). Their ICP has 2 key dimensions databases can't filter: (1) Video Intensity — how central is video to the company, (2) Technical Builder — do they build software products.
- **Existing infra:** Clay Webhook OS runs on VPS (178.156.249.201), Python/FastAPI, file-based storage. Ollama needs to be installed alongside.
- **Per-client config:** Each client profile (`clients/{slug}/profile.md`) already has ICP sections. The scorer needs a structured ICP scoring config added to client profiles.
- **Cost constraint:** $0 marginal cost per inference. The whole point is this runs cheaper than any API.
- **Time budget:** 12+ hours unattended is acceptable. ~5-10s per company on CPU with 7B model = ~4,300-8,600 companies per 12hr run.

## Constraints

- **Infra**: Must run on existing VPS (no GPU). Ollama on CPU only.
- **Model size**: 7-8B parameter models max (CPU inference speed constraint)
- **Storage**: File-based job storage (JSON in `data/`), no database
- **Dependencies**: Ollama is the only new system dependency
- **Patterns**: Must follow existing Webhook OS patterns — routers in `app/routers/`, models in `app/models/`, stores in `app/core/`, state via `app.state`

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ollama on CPU, not GPU | Zero cost, VPS has no GPU, 12hr runtime acceptable | — Pending |
| 7-8B model (not 120B) | CPU inference requires small model, accuracy sufficient for binary ICP filter | — Pending |
| Per-client configurable dimensions | Different clients have different ICP criteria (video for 12 Labs, hiring for others) | — Pending |
| Async job queue, not real-time | Batch of thousands takes hours, must be non-blocking | — Pending |
| File-based job persistence | Matches existing Webhook OS patterns, no new DB dependency | — Pending |

---
*Last updated: 2026-03-11 after initialization*
