---
phase: 02-deepline-enrichment
plan: 01
subsystem: api
tags: [deepline, enrichment, email-waterfall, firmographic, httpx, research-fetcher]

# Dependency graph
requires:
  - phase: none
    provides: existing research_fetcher.py pattern (Parallel.ai + Sumble)
provides:
  - fetch_deepline_email async function for email waterfall discovery
  - fetch_deepline_company async function for firmographic enrichment
  - _deepline_execute shared HTTP helper for DeepLine API
  - DeepLine config settings (api_key, base_url, timeout)
  - Webhook wiring for company-research and people-research skills
affects: [04-demo-flow, enrichment pipelines, people-research, company-research]

# Tech tracking
tech-stack:
  added: [deepline-api]
  patterns: [deepline-http-execute, multi-path-response-extraction, waterfall-provider-integration]

key-files:
  created: []
  modified:
    - app/config.py
    - app/core/research_fetcher.py
    - app/routers/webhook.py
    - .env.example
    - tests/test_research_fetcher.py
    - tests/test_config.py

key-decisions:
  - "HTTP API only (no DeepLine CLI) -- VPS doesn't have CLI installed"
  - "60s timeout for email waterfall (6-provider chain can be slow), 30s for company enrichment"
  - "Multi-path response extraction (data.email OR data.emails[0].address) to handle provider variance"
  - "Bearer auth header pattern (matching existing Sumble pattern)"

patterns-established:
  - "DeepLine execute pattern: single POST to /api/v2/integrations/execute with {provider, operation, payload}"
  - "Flexible field extraction: check nested path (data.output.company) then flat path (data directly)"

requirements-completed: [ENRICH-01, ENRICH-02, ENRICH-03]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 2 Plan 01: DeepLine Enrichment Summary

**DeepLine email waterfall and firmographic company enrichment via HTTP API with TDD (12 tests, 3 production modules)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T18:55:40Z
- **Completed:** 2026-03-13T18:59:42Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added DeepLine as third enrichment provider alongside Parallel.ai and Sumble
- Email waterfall discovery via `cost_aware_first_name_and_domain_to_email_waterfall` operation (6-provider chain)
- Firmographic company enrichment via `deepline_native_enrich_company` operation
- 12 new unit tests covering success, failure, HTTP errors, alternate response paths, and config
- Full test suite green: 2292 tests passing with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: RED -- Write DeepLine unit tests** - `92bef13` (test)
2. **Task 2: GREEN -- Implement DeepLine provider + webhook wiring** - `6ffd5a4` (feat)

## Files Created/Modified
- `app/config.py` - Added deepline_api_key, deepline_base_url, deepline_timeout settings
- `app/core/research_fetcher.py` - Added _deepline_execute, fetch_deepline_email, fetch_deepline_company functions
- `app/routers/webhook.py` - Wired DeepLine into _maybe_fetch_research for company-research and people-research
- `.env.example` - Added DEEPLINE_API_KEY placeholder
- `tests/test_research_fetcher.py` - Added TestFetchDeeplineEmail (5 tests), TestFetchDeeplineCompany (4 tests)
- `tests/test_config.py` - Added TestConfigDeepline (3 tests)

## Decisions Made
- Used HTTP API exclusively (no DeepLine CLI) -- CLI not installed on VPS
- Set 60s timeout for email waterfall (6-provider chain worst case is 30-45s) vs 30s for company enrichment
- Multi-path response extraction handles provider variance (email at data.email or data.emails[0].address, company data at data.output.company or flat in data)
- Bearer auth header pattern matches existing Sumble integration

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration before live use:**
- Add `DEEPLINE_API_KEY` to local `.env` file (source: DeepLine dashboard or `~/.local/deepline/.env`)
- Add `DEEPLINE_API_KEY` to VPS `.env`: `ssh clay-vps "echo 'DEEPLINE_API_KEY=<key>' >> /opt/clay-webhook-os/.env"`
- Ensure DeepLine account has credits or BYOK provider keys configured
- Verify: `curl -s https://code.deepline.com/api/v2/integrations/execute -H "Authorization: Bearer <key>" -d '{}' | head -c 200`

## Issues Encountered
None

## Next Phase Readiness
- DeepLine integration complete and tested, ready for use in demo flow (Phase 4)
- company-research and people-research skills will automatically use DeepLine when DEEPLINE_API_KEY is set
- No blocking dependencies for Phase 3 (Batch Results Dashboard)

---
*Phase: 02-deepline-enrichment*
*Completed: 2026-03-13*
