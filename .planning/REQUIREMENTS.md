# Requirements: Batch ICP Scorer

**Defined:** 2026-03-11
**Core Value:** Score thousands of companies against any client's ICP at zero marginal cost

## v1 Requirements

### Infrastructure

- [ ] **INFRA-01**: Ollama installed and running on VPS as a systemd service
- [ ] **INFRA-02**: 7-8B model pulled and available (e.g., llama3.1:8b or qwen2.5:7b)
- [ ] **INFRA-03**: Health check endpoint verifies Ollama connectivity

### API

- [ ] **API-01**: `POST /batch-icp-score` accepts CSV upload (columns: company_name, domain, description) + client_slug
- [ ] **API-02**: Returns job_id immediately (async processing)
- [ ] **API-03**: `GET /batch-icp-score/{job_id}` returns job status + progress (queued/running/complete/failed)
- [ ] **API-04**: `GET /batch-icp-score/{job_id}/results` returns scored CSV when complete
- [ ] **API-05**: `GET /batch-icp-score/jobs` lists all jobs with status summary

### Scoring Engine

- [ ] **SCORE-01**: Reads ICP scoring config from client profile (dimensions, thresholds, prompt template)
- [ ] **SCORE-02**: Sends company_name + domain + description to Ollama with client's scoring prompt
- [ ] **SCORE-03**: Parses structured JSON response (dimension scores 1-5, reason)
- [ ] **SCORE-04**: Marks each company pass/fail based on client's threshold config
- [ ] **SCORE-05**: Handles Ollama errors gracefully (retry 2x, then mark row as "error")
- [ ] **SCORE-06**: Processes companies sequentially with progress tracking

### Job Queue

- [ ] **JOB-01**: Jobs persist to disk (JSON in data/icp-jobs/)
- [ ] **JOB-02**: Job state survives server restart — resumes incomplete jobs on startup
- [ ] **JOB-03**: Job stores: total rows, processed rows, passed rows, failed rows, error rows
- [ ] **JOB-04**: Job results stored as CSV in data/icp-jobs/{job_id}/results.csv

### Client Config

- [ ] **CFG-01**: Client profile supports `## ICP Scoring` section with structured config
- [ ] **CFG-02**: Config defines: dimension names, dimension descriptions (1-5 scale), pass thresholds
- [ ] **CFG-03**: Config defines: scoring prompt template with {company_name}, {domain}, {description} placeholders
- [ ] **CFG-04**: 12 Labs ICP scoring config created as first implementation (Video Intensity + Technical Builder)

### Dashboard

- [ ] **DASH-01**: Dashboard page to upload CSV and select client
- [ ] **DASH-02**: Job progress view (live progress bar, rows processed/total)
- [ ] **DASH-03**: Results view with pass/fail filtering and CSV download

## v2 Requirements

### Scale

- **SCALE-01**: Parallel scoring (multiple Ollama workers)
- **SCALE-02**: GPU support for faster inference
- **SCALE-03**: Model A/B testing (compare scoring accuracy across models)

### Integration

- **INT-01**: Auto-trigger enrichment pipeline for passed companies
- **INT-02**: Push scored results directly to Clay table
- **INT-03**: Webhook notification when job completes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time scoring | Batch/async only — designed for overnight runs |
| External API fallback | Zero cost is the core value proposition |
| Models > 8B | No GPU on VPS, CPU-only |
| Contact-level scoring | Companies only — contact enrichment is downstream |
| Multi-model ensemble | v1 uses single model, ensemble is v2+ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| API-01 | Phase 2 | Pending |
| API-02 | Phase 2 | Pending |
| API-03 | Phase 2 | Pending |
| API-04 | Phase 2 | Pending |
| API-05 | Phase 2 | Pending |
| SCORE-01 | Phase 2 | Pending |
| SCORE-02 | Phase 2 | Pending |
| SCORE-03 | Phase 2 | Pending |
| SCORE-04 | Phase 2 | Pending |
| SCORE-05 | Phase 2 | Pending |
| SCORE-06 | Phase 2 | Pending |
| JOB-01 | Phase 2 | Pending |
| JOB-02 | Phase 2 | Pending |
| JOB-03 | Phase 2 | Pending |
| JOB-04 | Phase 2 | Pending |
| CFG-01 | Phase 3 | Pending |
| CFG-02 | Phase 3 | Pending |
| CFG-03 | Phase 3 | Pending |
| CFG-04 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-03-11*
