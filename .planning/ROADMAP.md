# Roadmap: Batch ICP Scorer

## Milestone 1: Core Batch ICP Scoring System

### Phase 1: Ollama Infrastructure
**Goal:** Ollama installed, running, and verified on VPS with a 7-8B model

**Requirements:** INFRA-01, INFRA-02, INFRA-03

**Tasks:**
1. Install Ollama on VPS
2. Pull a 7-8B model (llama3.1:8b or qwen2.5:7b)
3. Configure Ollama as systemd service (auto-start, restart on failure)
4. Add `/health/ollama` endpoint to verify connectivity
5. Test inference speed on VPS CPU (benchmark: time per company)

**Success Criteria:**
- Ollama responds to API calls on VPS
- Model loaded and generating responses
- Health endpoint returns Ollama status
- Benchmark: <15s per company on CPU

---

### Phase 2: Scoring Engine + Job Queue + API
**Goal:** Upload CSV via API, score companies async with Ollama, retrieve results

**Requirements:** API-01 through API-05, SCORE-01 through SCORE-06, JOB-01 through JOB-04

**Tasks:**
1. Create `app/models/icp_scoring.py` — request/response models
2. Create `app/core/icp_job_store.py` — file-based job persistence in `data/icp-jobs/`
3. Create `app/core/icp_scorer.py` — Ollama integration, prompt assembly, response parsing
4. Create `app/routers/icp_scoring.py` — API endpoints (upload, status, results, list)
5. Wire job queue into background worker (process jobs sequentially)
6. Add job resume logic on startup in `app/main.py`
7. End-to-end test: upload CSV → poll status → download scored results

**Success Criteria:**
- CSV upload returns job_id
- Job progresses through companies, updating progress
- Scored CSV contains original columns + scores + reason + pass/fail
- Job survives server restart and resumes
- Ollama errors retried 2x then marked as error rows

---

### Phase 3: Client ICP Config (12 Labs First)
**Goal:** Scoring dimensions configurable per client, 12 Labs fully configured

**Requirements:** CFG-01 through CFG-04

**Tasks:**
1. Define `## ICP Scoring` section format for client profiles
2. Build config parser in `app/core/icp_scorer.py` to read client ICP config
3. Create 12 Labs ICP scoring config (Video Intensity + Technical Builder dimensions)
4. Create scoring prompt template with dimension definitions and JSON output format
5. Test with real company data — verify scoring accuracy on known-good and known-bad companies

**Success Criteria:**
- Scoring prompt dynamically assembled from client config
- 12 Labs config produces accurate Video (1-5) + Technical (1-5) scores
- Known video companies (Netflix, Mux) score 4-5 on Video Intensity
- Known non-video companies (Stripe, Datadog) score 1-2 on Video Intensity
- Pass/fail threshold correctly filters

---

### Phase 4: Dashboard UI
**Goal:** Upload, monitor, and download ICP scoring jobs from the dashboard

**Requirements:** DASH-01 through DASH-03

**Tasks:**
1. Create `dashboard/src/app/icp-scorer/page.tsx` — main page
2. Build CSV upload component with client selector
3. Build job progress component (live polling, progress bar)
4. Build results table with pass/fail filtering
5. Add CSV download button for filtered results
6. Add nav link in sidebar

**Success Criteria:**
- User can upload CSV and select client from dashboard
- Progress updates live as companies are scored
- Results table shows scores, reasons, pass/fail
- CSV download works with filters applied

---

## Phase Summary

| # | Phase | Requirements | Est. Plans |
|---|-------|-------------|------------|
| 1 | Ollama Infrastructure | INFRA-01..03 | 1 |
| 2 | Scoring Engine + Job Queue + API | API-01..05, SCORE-01..06, JOB-01..04 | 2-3 |
| 3 | Client ICP Config | CFG-01..04 | 1 |
| 4 | Dashboard UI | DASH-01..03 | 1-2 |

**Total:** 4 phases, 25 requirements
