# Phase 4: Demo Flow - Research

**Researched:** 2026-03-13
**Domain:** End-to-end demo orchestration (synthetic data creation + multi-pass batch processing + dashboard viewing)
**Confidence:** HIGH

## Summary

Phase 4 is the capstone -- it proves the system works end-to-end by running a complete two-pass demo: messy CSV data in, classified + enriched + personalized emails out, viewable in the batch results dashboard with per-row and total cost displayed. All the infrastructure is already built across Phases 1-3. This phase creates no new backend code, no new frontend code, and no new skills. It creates two artifacts: (1) a synthetic CSV file with 50 companies and (2) a demo execution script/runbook that drives the existing APIs.

The existing system already supports everything needed. The `POST /batch` endpoint accepts rows and a `skill` parameter. The `classify` skill (Phase 1) normalizes titles and industries. The DeepLine integration in `research_fetcher.py` (Phase 2) provides email waterfall and company enrichment. The `email-gen` skill generates personalized emails using client profiles. The batch results dashboard (Phase 3) at `/batch-results?id=<batch_id>` shows sortable/filterable results with confidence coloring and email preview. Per-row cost (`cost_est_usd`) and total cost (`equivalent_api_usd`) are already displayed in the summary bar.

The key challenge is designing the synthetic CSV to showcase the system's strengths -- varied data quality that demonstrates classify's normalization ability, realistic enough companies that DeepLine enrichment returns useful data, and enough variety in titles/industries to show the full taxonomy. The demo flow itself is straightforward: three sequential batch API calls, waiting for each to complete before feeding results into the next pass.

**Primary recommendation:** Create `data/demo/synthetic-50.csv` with intentionally varied data quality. Write a demo runbook (shell script or documented curl sequence) that executes: (1) classify batch on all 50 rows, (2) filter to top-scoring companies, (3) run email-gen on the winners using Twelve Labs profile. View results in the existing batch-results dashboard.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEMO-01 | Synthetic test CSV of 50 companies with varied data quality (clean + messy + missing fields) | CSV should include 5 data quality tiers: ~10 clean rows (all fields present, proper formatting), ~10 good rows (slight abbreviations, minor messiness), ~10 medium rows (abbreviated titles, missing some fields), ~10 messy rows (misspellings, mixed formats, ambiguous titles), ~10 sparse rows (minimal data, missing multiple fields). This exercises classify's normalization across the full spectrum. |
| DEMO-02 | Two-pass demo flow works end-to-end: classify -> enrich -> email-gen using Twelve Labs profile | Three-step batch execution via existing `POST /batch` API: Step 1 (classify, haiku), Step 2 (company-research + email enrichment via DeepLine), Step 3 (email-gen with `client_slug: "twelve-labs"`). Each step's output feeds the next step's input. Results viewable at `/batch-results?id=<batch_id>` with confidence coloring and email preview. |
</phase_requirements>

## Standard Stack

### Core (All Existing -- No New Dependencies)

| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| Batch API | `app/routers/batch.py` | `POST /batch` processes arrays of rows through any skill | Existing -- handles queuing, status tracking, cost, caching |
| Classify skill | `skills/classify/skill.md` | Normalizes titles to seniority, companies to industries | Phase 1 output -- model_tier: light (haiku) |
| Email-gen skill | `skills/email-gen/skill.md` | Generates personalized cold emails using PVC framework | Existing -- uses Twelve Labs client profile |
| Research fetcher | `app/core/research_fetcher.py` | DeepLine email waterfall + company enrichment | Phase 2 output -- HTTP API integration |
| Batch results page | `dashboard/src/app/batch-results/page.tsx` | Sortable/filterable table with confidence coloring + email preview | Phase 3 output -- SpreadsheetView + Sheet side panel |
| Dataset system | `app/routers/datasets.py` | Alternative: stage-based pipeline execution on imported CSV | Existing -- supports classify, find-email, and any skill as stages |
| Job queue | `app/core/job_queue.py` | Async batch processing with per-row tracking | Existing -- tracks cost_est_usd per job |
| Token estimator | `app/core/token_estimator.py` | Per-row and total cost calculation | Existing -- haiku ($0.25/M in, $1.25/M out), sonnet pricing |

### Supporting

| Component | Location | Purpose | When to Use |
|-----------|----------|---------|-------------|
| Pipeline runner | `app/core/pipeline_runner.py` | Multi-step skill chains with condition evaluation | If demo needs single-call multi-step execution (pipeline mode) |
| Twelve Labs profile | `clients/twelve-labs/profile.md` | Client context for email-gen | Required for email personalization -- pass `client_slug: "twelve-labs"` |
| Context filter | `app/core/context_filter.py` | Filters client profile sections per skill | Automatic -- email-gen already registered |
| Batch history | `/batch-results` (no ID) | Lists all previous batch runs | Navigate to see all demo batches |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Three sequential `POST /batch` calls | Single pipeline YAML | Pipeline mode chains skills per-row (classify -> email-gen), but doesn't allow filtering between passes. Sequential batches let you filter top-scoring companies between classify and email-gen. |
| `POST /batch` API | Dataset pipeline (`POST /datasets/{id}/run-stage`) | Dataset API supports stage-based pipeline (classify stage, email-gen stage) with condition filtering. More polished for demo but adds complexity. Both work. |
| curl demo script | Python script | Python is cleaner for multi-step orchestration with response parsing. Curl is more transparent for demo walkthrough. |

## Architecture Patterns

### Demo Execution Flow

The two-pass demo has three distinct steps:

```
Step 1: Classify (haiku - pennies)
  POST /batch {skill: "classify", rows: [50 CSV rows]}
  → Normalizes titles, industries, assigns confidence scores
  → Wait for completion: GET /batch/{batch_id} until done=true

Step 2: Enrich (DeepLine - optional, adds real-world data)
  For top-scoring companies (confidence >= 0.7):
  POST /batch {skill: "company-research", rows: [filtered rows with company_domain]}
  → DeepLine firmographic enrichment + Parallel.ai web intel
  → Wait for completion

Step 3: Email Gen (sonnet - cost per email)
  POST /batch {skill: "email-gen", rows: [enriched rows + client_slug: "twelve-labs"]}
  → Personalized emails using Twelve Labs profile + PVC framework
  → Wait for completion
  → View at /batch-results?id={batch_id}
```

### Pattern 1: Synthetic CSV Design

**What:** A CSV file with 50 companies designed to exercise the full system.

**Column structure:**
```csv
first_name,last_name,title,company_name,company_domain,company_description,industry,employee_count
```

**Data quality tiers (10 rows each):**

| Tier | Title Quality | Company Data | Expected Classify Confidence |
|------|--------------|--------------|------|
| Clean | "VP of Engineering" | Full description + industry + domain | 0.9-1.0 |
| Good | "sr. software eng" | Description + domain, no explicit industry | 0.7-0.9 |
| Medium | "Head of Growth" | Company name + domain only | 0.5-0.7 |
| Messy | "cto & co-founder" | Partial description, no domain | 0.3-0.5 |
| Sparse | "associate" or missing | Just company name | 0.1-0.3 |

**Industry distribution:** Cover at least 8 of the 14 verticals to show taxonomy breadth.

**Company selection criteria:**
- Use **real company domains** for the clean/good tiers so DeepLine enrichment returns actual data
- Use **plausible fake companies** for messy/sparse tiers (DeepLine will return empty, which is fine -- demonstrates graceful handling)
- Target companies in Twelve Labs' ICP verticals (Media, Security, Sports, EdTech, AdTech) for email-gen relevance

### Pattern 2: Demo Script Structure

**What:** A shell script or Python script that executes the demo end-to-end.

**Structure:**
```bash
#!/bin/bash
# demo.sh -- Two-pass demo: classify -> enrich -> email-gen
API_URL="http://localhost:8000"  # or https://clay.nomynoms.com

# Step 1: Classify all 50 rows
echo "=== Step 1: Classify (haiku) ==="
BATCH1=$(curl -s "$API_URL/batch" -H "Content-Type: application/json" \
  -d @data/demo/classify-payload.json | python3 -c "import sys,json; print(json.load(sys.stdin)['batch_id'])")
echo "Batch ID: $BATCH1"

# Poll until done
while true; do
  STATUS=$(curl -s "$API_URL/batch/$BATCH1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d[\"completed\"]}/{d[\"total_rows\"]} done, cost: \${d[\"cost\"][\"equivalent_api_usd\"]:.4f}'); print('DONE' if d['done'] else '')")
  echo "$STATUS"
  echo "$STATUS" | grep -q DONE && break
  sleep 3
done

# Step 2: ... (filter + enrich)
# Step 3: ... (email-gen on winners)
```

### Pattern 3: Dataset Pipeline Alternative

The existing dataset system (`/pipeline` page) already supports a stage-based workflow:
1. Create dataset, import CSV
2. Run `classify` stage (normalizes titles/industries)
3. Run `find-email` stage (Findymail email discovery)
4. Run `email-gen` stage with `config: {client_slug: "twelve-labs"}`

This is the more polished demo path since it shows the pipeline UI. However, the batch API approach is more transparent for proving "CW-OS replaces Clay" because it mirrors the Clay webhook flow.

**Recommendation:** Create the synthetic CSV and a batch API demo script. The dataset pipeline can be shown as a bonus "here's the polished version."

### Anti-Patterns to Avoid

- **Using fake/disposable domains in the CSV for DeepLine enrichment:** DeepLine rejects disposable domains with 422 errors. Use real company domains for rows that will be enriched.
- **Running all 50 rows through email-gen:** The demo narrative is "classify -> filter winners -> personalize." Running all 50 wastes tokens and dilutes the story. Filter to ~15-20 high-confidence rows.
- **Hardcoding batch IDs in the demo script:** Each run generates new batch IDs. The script must capture and pass them dynamically.
- **Skipping the cost display:** The entire demo value is "here's what it cost." Always show `cost.equivalent_api_usd` from the batch status response and the per-row `cost_est_usd` in the dashboard.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Batch processing | Custom row-by-row loop | `POST /batch` API | Already handles queuing, cost tracking, parallel processing |
| Data normalization | Manual CSV cleaning | `classify` skill via batch API | The whole point of the demo is that AI handles messy data |
| Email personalization | Template-based emails | `email-gen` skill with Twelve Labs profile | PVC framework + client context produces better emails than templates |
| Results visualization | Custom demo dashboard | Existing `/batch-results` page | SpreadsheetView with confidence coloring already built in Phase 3 |
| Cost calculation | Manual token counting | `token_estimator.py` + batch status endpoint | Already calculates per-row and total cost automatically |
| Multi-step orchestration | Custom pipeline code | Sequential batch API calls (or existing pipeline system) | Both patterns already exist and are tested |

**Key insight:** This phase should create ZERO new code in `app/` or `dashboard/`. Everything is about composing existing pieces into a compelling demo. If this phase requires writing new backend or frontend code, something went wrong in Phases 1-3.

## Common Pitfalls

### Pitfall 1: Synthetic Data Too Clean
**What goes wrong:** All 50 rows classify perfectly with 0.95+ confidence, making the demo boring. The "messy data normalization" story falls flat.
**Why it happens:** Overengineering the CSV to be realistic means clean data.
**How to avoid:** Intentionally include messy titles ("sr. software eng", "cto & co-founder", "Partner"), missing fields, and ambiguous industries. At least 20 of 50 rows should have confidence < 0.7.
**Warning signs:** Uniform green coloring in the batch results dashboard (no yellow/red rows).

### Pitfall 2: DeepLine Enrichment Fails on Synthetic Domains
**What goes wrong:** Fake company domains return empty enrichment, making the "enrich" pass look broken.
**Why it happens:** DeepLine needs real domains to return data. Synthetic companies with made-up domains return nothing.
**How to avoid:** Use real company domains for at least 20-30 rows. Good targets: real mid-market companies in Twelve Labs' ICP verticals (media, security, edtech). The messy/sparse rows can have fake domains since those rows will be filtered out by confidence scoring anyway.
**Warning signs:** All enrichment results empty, email fields blank.

### Pitfall 3: Email-Gen Without Client Slug
**What goes wrong:** Emails are generic and impersonal because `client_slug: "twelve-labs"` wasn't passed in the batch request.
**Why it happens:** Forgetting to include `client_slug` in each row's data dict for the email-gen batch.
**How to avoid:** Every row in the email-gen batch must include `client_slug: "twelve-labs"`. The skill loads context files that reference `{{client_slug}}`, so without it, the client profile doesn't load.
**Warning signs:** Emails that don't mention video intelligence, API, or anything Twelve Labs-specific.

### Pitfall 4: Batch Status Polling Too Aggressive
**What goes wrong:** Hundreds of GET requests per second while waiting for batch completion.
**Why it happens:** Polling without a sleep interval, or sleep interval too short.
**How to avoid:** Poll every 3-5 seconds. For 50 rows with haiku (classify), expect ~2-3 minutes total. For email-gen (sonnet), expect ~5-8 minutes.
**Warning signs:** API logs flooded with `/batch/{id}` requests.

### Pitfall 5: Cost Not Visible in Demo
**What goes wrong:** The demo ends but nobody knows what it cost. The "cheaper than Clay" narrative is lost.
**Why it happens:** Not emphasizing cost display in the demo script output or dashboard.
**How to avoid:** The batch status endpoint already returns `cost.equivalent_api_usd` (total) and each job has `cost_est_usd` (per-row). The batch results dashboard summary bar already shows total cost. Make sure the demo script prints costs at each step and at the end shows a total across all three passes.
**Warning signs:** Demo walkthrough that doesn't mention cost numbers.

### Pitfall 6: classify Output Fields Don't Match email-gen Input Fields
**What goes wrong:** classify outputs `title_normalized` but email-gen expects `title`. The classification results don't flow into email generation.
**Why it happens:** Each skill has its own input/output schema. No automatic field mapping between skills.
**How to avoid:** When building the email-gen batch payload, merge the original row data with classify results. email-gen uses `title`, `company_name`, `industry`, `company_domain`, `first_name`, `signal_type`, etc. The classify output adds `title_normalized`, `industry_normalized`, `confidence_score`. Both the original fields and the normalized fields should be present in the email-gen input.
**Warning signs:** email-gen has low confidence because it's missing basic fields like `company_name` or `first_name`.

## Code Examples

### Synthetic CSV Structure (First 5 Rows)

```csv
first_name,last_name,title,company_name,company_domain,company_description,industry,employee_count
Sarah,Chen,VP of Engineering,Mux,mux.com,"Video infrastructure API for developers — streaming, encoding, and analytics",Media/Video,250
James,Park,sr. software eng,Vimeo,vimeo.com,"Online video platform for creators and businesses",Media & Entertainment,1200
Maria,Rodriguez,Head of Growth,Wistia,wistia.com,"Video hosting and marketing platform for businesses",,150
Alex,Thompson,cto & co-founder,VidStream AI,vidstreamai.com,"We do video stuff with AI",,25
Jordan,Lee,associate,TechCorp,,,,
```

### Batch Request for Classify Step

```json
{
  "skill": "classify",
  "rows": [
    {
      "row_id": "1",
      "title": "VP of Engineering",
      "company_name": "Mux",
      "company_description": "Video infrastructure API for developers",
      "industry": "Media/Video"
    },
    {
      "row_id": "2",
      "title": "sr. software eng",
      "company_name": "Vimeo",
      "company_description": "Online video platform for creators"
    }
  ]
}
```

### Batch Request for Email-Gen Step (After Classify + Enrich)

```json
{
  "skill": "email-gen",
  "rows": [
    {
      "row_id": "1",
      "first_name": "Sarah",
      "last_name": "Chen",
      "title": "VP of Engineering",
      "company_name": "Mux",
      "company_domain": "mux.com",
      "industry": "Media/Video",
      "client_slug": "twelve-labs",
      "title_normalized": "VP",
      "industry_normalized": "Media/Entertainment",
      "confidence_score": 0.95,
      "company_size": "250",
      "tech_stack": ["Node.js", "Go", "AWS"]
    }
  ]
}
```

### Cost Display After Each Step

```python
# After each batch completes, print cost summary
import json, sys

# Inline in demo script:
# curl -s "$API_URL/batch/$BATCH_ID" | python3 -c "
d = json.load(sys.stdin)
print(f"Classify: {d['total_rows']} rows, ${d['cost']['equivalent_api_usd']:.4f} total")
print(f"  Per row: ${d['cost']['equivalent_api_usd'] / d['total_rows']:.6f}")
print(f"  Model: haiku | Tokens: {d['tokens']['total_est']:,}")
# "
```

### Expected Cost Breakdown

Based on token estimator pricing:

| Step | Model | Est. Rows | Input Tokens/Row | Output Tokens/Row | Cost/Row | Total |
|------|-------|-----------|-------------------|--------------------|---------:|------:|
| Classify | haiku | 50 | ~500 | ~100 | $0.00025 | $0.0125 |
| Email-gen | sonnet | ~20 | ~3,000 | ~300 | $0.012 | $0.24 |
| **Total** | | | | | | **~$0.25** |

This is the demo punchline: "50 companies classified, 20 personalized emails generated, total cost: 25 cents."

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Clay setup per client | CW-OS batch API + skills | Existing | One API call replaces Clay's multi-step configuration |
| Individual provider integrations | DeepLine unified waterfall | Phase 2 | Single integration for email discovery + firmographic enrichment |
| Manual data cleaning | AI classification (haiku) | Phase 1 | Messy titles normalized for pennies per row |
| Separate tools for each step | Sequential batch API calls | This phase | Prove end-to-end flow in one demo |

## Open Questions

1. **Should the demo use the batch API or the dataset pipeline system?**
   - What we know: The batch API (`POST /batch`) is the core webhook flow that mirrors how Clay integrates. The dataset pipeline (`/pipeline` page) is a newer stage-based system with UI for import/stage/export.
   - What's unclear: Which better serves the demo narrative ("CW-OS replaces Clay" vs "CW-OS has a pipeline UI").
   - Recommendation: Primary demo uses batch API (proves the core webhook flow). Show dataset pipeline as bonus. The batch API demo is more transparent and directly proves the "Clay replacement" narrative.

2. **How to handle the enrichment step between classify and email-gen?**
   - What we know: email-gen benefits from enriched data (company research, tech stack, news). The `company-research` skill calls Parallel.ai + Sumble + DeepLine automatically via `_maybe_fetch_research`.
   - What's unclear: Whether to run a separate `company-research` batch between classify and email-gen, or just pass the raw data to email-gen and let it work with what it has.
   - Recommendation: For the demo, pass classify output + original CSV data directly to email-gen. The email-gen skill works with whatever data is available and adjusts confidence accordingly. Running a separate enrichment batch adds time and cost for modest improvement in the demo context. If enrichment is desired, use it selectively on the top 5-10 companies only.

3. **Should the demo script be a shell script, Python script, or both?**
   - What we know: Shell scripts are more transparent for demos (show the exact curl commands). Python scripts are cleaner for multi-step orchestration with response parsing and field merging.
   - What's unclear: Who runs the demo -- technical team (comfortable with scripts) or sales team (needs one-click).
   - Recommendation: Python script. It needs to parse JSON responses, merge fields between steps, and filter by confidence -- awkward in pure bash. Include the equivalent curl commands as comments for transparency.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (existing, 2292 tests passing) + manual demo execution |
| Config file | `tests/conftest.py` |
| Quick run command | `source .venv/bin/activate && python -m pytest tests/ --tb=short -q` |
| Full suite command | `source .venv/bin/activate && python -m pytest tests/ --tb=short` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEMO-01 | Synthetic CSV exists with 50 rows and varied data quality | unit | `python -m pytest tests/test_demo_data.py -v` | No -- Wave 0 |
| DEMO-02 | Demo script executes end-to-end (classify -> email-gen) | manual + smoke | Run `python scripts/demo.py --dry-run` to validate payload structure without API calls | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `source .venv/bin/activate && python -m pytest tests/ --tb=short -q` (existing tests don't break)
- **Per wave merge:** Full suite green
- **Phase gate:** Demo script runs successfully against local backend, batch results visible in dashboard

### Wave 0 Gaps
- [ ] `data/demo/synthetic-50.csv` -- 50-row CSV with varied data quality (DEMO-01)
- [ ] `scripts/demo.py` -- Python demo script that orchestrates classify -> email-gen (DEMO-02)
- [ ] `tests/test_demo_data.py` -- Validates CSV structure (50 rows, required columns, data quality tiers)

## Sources

### Primary (HIGH confidence)
- Codebase: `app/routers/batch.py` -- batch API (POST /batch, GET /batch/{id}) with cost tracking
- Codebase: `skills/classify/skill.md` -- classify skill with seniority/industry taxonomy
- Codebase: `skills/email-gen/skill.md` -- email generator with PVC framework, uses client profile
- Codebase: `clients/twelve-labs/profile.md` -- complete client profile with ICP, personas, messaging
- Codebase: `app/core/research_fetcher.py` -- DeepLine email waterfall + company enrichment
- Codebase: `dashboard/src/app/batch-results/page.tsx` -- batch results page with SpreadsheetView + Sheet
- Codebase: `dashboard/src/components/batch/email-preview-panel.tsx` -- confidence coloring + email preview
- Codebase: `app/core/token_estimator.py` -- cost estimation (haiku: $0.25/$1.25 per M tokens)
- Codebase: `app/models/requests.py` -- BatchRequest model (skill + rows + instructions)
- Codebase: `app/routers/datasets.py` -- dataset pipeline (create, import CSV, run-stage)

### Secondary (MEDIUM confidence)
- Phase 1 research: classify skill architecture, seniority/industry taxonomies
- Phase 2 research: DeepLine API patterns, response shape variance
- Phase 3 research: SpreadsheetView reuse, confidence coloring thresholds

### Tertiary (LOW confidence)
- None -- all findings verified from codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- every component already built and tested in Phases 1-3
- Architecture: HIGH -- demo flow is composition of existing APIs, no new code needed
- Pitfalls: HIGH -- identified from real API behavior and data quality edge cases observed during Phase 1-3 research
- Cost estimates: HIGH -- based on token_estimator.py pricing, confirmed haiku and sonnet rates

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- entirely codebase-internal, no external dependencies to shift)
