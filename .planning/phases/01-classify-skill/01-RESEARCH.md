# Phase 1: Classify Skill - Research

**Researched:** 2026-03-13
**Domain:** CW-OS skill authoring, batch API integration, LLM-based data classification
**Confidence:** HIGH

## Summary

Phase 1 adds a single new skill (`classify`) to the existing CW-OS skill system. The classify skill normalizes messy job titles into seniority levels (IC/Manager/Director/VP/C-Suite) and categorizes companies into industry verticals, returning structured JSON with original values, normalized values, and per-field confidence scores. It runs on haiku model tier for cost efficiency.

The existing infrastructure fully supports this work. The skill system auto-discovers skills from the `skills/` directory (no registration needed), the batch API (`POST /batch`) already processes arrays of rows through any skill, and the model router already maps `model_tier: light` to haiku. No new backend code is needed beyond the skill.md file itself and an entry in `SKILL_CLIENT_SECTIONS` (only if the skill loads client profiles -- which this skill should not).

**Primary recommendation:** Create `skills/classify/skill.md` with `model_tier: light` and `skip_defaults: true` frontmatter. No client profile loading, no knowledge base files, no new API endpoints. Test via existing `POST /batch` with `skill: "classify"`. The entire phase is one well-crafted skill.md file plus tests.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKILL-01 | Classify skill normalizes job titles to standard seniority levels (IC/Manager/Director/VP/C-Suite) | Skill output format includes `title_normalized` with seniority level and `title_confidence` score. Haiku handles simple classification reliably. |
| SKILL-02 | Classify skill categorizes companies into standard industry verticals | Skill output format includes `industry_normalized` with standardized vertical and `industry_confidence` score. |
| SKILL-03 | Classify skill outputs structured JSON with original values, normalized values, and per-field confidence scores | Output schema preserves originals (`title_original`, `industry_original`), adds normalized values, and per-field confidence. Follows existing skill JSON output pattern. |
| SKILL-04 | Classify skill uses haiku model tier for cost efficiency | Frontmatter `model_tier: light` maps to haiku via existing `model_router.py`. Estimated cost: $0.0003/row (well under $0.01 threshold). |
</phase_requirements>

## Standard Stack

### Core

This phase uses only existing CW-OS infrastructure. No new libraries or dependencies.

| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| Skill system | `app/core/skill_loader.py` | Auto-discovers `skills/classify/skill.md` | Existing pattern -- all 15 active skills use it |
| Batch API | `app/routers/batch.py` | `POST /batch` processes arrays of rows | Already exists, supports `skill: "classify"` out of the box |
| Model router | `app/core/model_router.py` | Maps `model_tier: light` to haiku | Existing -- archived `icp-scorer` used same `light` tier |
| Context assembler | `app/core/context_assembler.py` | Builds 6-layer prompt | Existing -- classify needs minimal context layers |
| Token estimator | `app/core/token_estimator.py` | Tracks cost per row | Haiku pricing: $0.25/M input, $1.25/M output |

### Supporting

| Component | Location | Purpose | When to Use |
|-----------|----------|---------|-------------|
| Context filter | `app/core/context_filter.py` | Filters client profile sections per skill | Only if classify loads client profiles (it should NOT) |
| Job queue | `app/core/job_queue.py` | Async batch processing with SSE | Already wired into batch router |
| Cache | `app/core/cache.py` | TTL-based result caching | Automatic -- identical rows return cached results |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LLM classification (haiku) | Rule-based regex/lookup | Rules are brittle with messy data; LLM handles typos, abbreviations, foreign titles gracefully |
| Single classify skill | Separate title-classify + industry-classify skills | One skill keeps it simple; if rows have both fields, one call handles both |
| `model_tier: light` | Direct `model: haiku` in frontmatter | `model_tier` is the standard convention used across all skills |

## Architecture Patterns

### Skill File Structure

```
skills/
  classify/
    skill.md          # The only file needed
```

### Skill Frontmatter Pattern

The classify skill should use lean frontmatter similar to the archived `icp-scorer`:

```yaml
---
model_tier: light
skip_defaults: true
semantic_context: false
---
```

Key decisions:
- `model_tier: light` -- maps to haiku via `settings.model_tier_map` (confirmed in `config.py` line 30)
- `skip_defaults: true` -- skips auto-loading `knowledge_base/_defaults/*.md` (saves tokens, classify needs no writing style guides)
- `semantic_context: false` -- skips semantic context search (irrelevant for classification)
- No `context:` list -- classify does not need client profiles or knowledge base files

### Output Schema Pattern

The output schema should follow the existing skill convention of flat JSON with `confidence_score`, but adapted for multi-field classification:

```json
{
  "title_original": "string, the raw title from input",
  "title_normalized": "string, one of: IC, Manager, Director, VP, C-Suite, Unknown",
  "title_department": "string, functional area (Engineering, Sales, Marketing, etc.)",
  "title_confidence": "number 0.0-1.0",
  "industry_original": "string, the raw industry/description from input",
  "industry_normalized": "string, standardized industry vertical",
  "industry_confidence": "number 0.0-1.0",
  "confidence_score": "number 0.0-1.0, overall confidence (min of field confidences)"
}
```

Notes on this schema:
- Preserves original values (SKILL-03 requirement)
- Per-field confidence scores (SKILL-03 requirement)
- Overall `confidence_score` follows convention used by every existing skill
- `title_department` is a bonus field that adds value for downstream filtering (e.g., only email Engineering leaders)
- `Unknown` seniority level handles cases where title is gibberish or unclassifiable

### Seniority Level Taxonomy

The five levels specified in the requirements:

| Level | Example Titles |
|-------|---------------|
| IC | Software Engineer, Account Executive, Designer, Analyst |
| Manager | Engineering Manager, Sales Manager, Team Lead |
| Director | Director of Engineering, Senior Director of Sales |
| VP | VP of Sales, SVP Marketing, Vice President |
| C-Suite | CEO, CTO, CFO, COO, Chief Revenue Officer |

Edge cases to handle in skill rules:
- "Head of" -- typically VP-level
- "Lead" -- typically IC or Manager depending on context
- "Principal" -- typically senior IC
- "Founder" -- typically C-Suite
- "Partner" -- context-dependent (IC at consulting firms, C-Suite at small firms)

### Industry Vertical Taxonomy

Standard B2B verticals the skill should normalize to:

| Vertical | Includes |
|----------|----------|
| SaaS / Software | Cloud software, dev tools, platforms |
| Fintech | Payments, banking, insurance tech, crypto |
| Healthcare / Life Sciences | Medtech, biotech, pharma, health IT |
| E-Commerce / Retail | Online retail, marketplace, DTC |
| Manufacturing | Industrial, supply chain, logistics |
| Media / Entertainment | Content, streaming, gaming, publishing |
| Education / EdTech | Learning platforms, universities, training |
| Real Estate / PropTech | Property management, construction |
| Professional Services | Consulting, legal, accounting |
| Energy / CleanTech | Utilities, renewables, oil & gas |
| Telecommunications | Carriers, infrastructure, networking |
| Government / Public Sector | Federal, state, defense, civic |
| Financial Services | Banking, insurance, asset management |
| Other | Anything that doesn't fit above |

### Batch API Usage Pattern

The batch API already handles everything needed. The request shape:

```json
{
  "skill": "classify",
  "rows": [
    {"title": "sr. software eng", "company_description": "We build AI tools for developers"},
    {"title": "VP Sales & Marketing", "company_description": "Healthcare SaaS platform"},
    {"title": "chief executive", "industry": "fintech"}
  ]
}
```

Key behavior (confirmed from `app/routers/batch.py`):
- Each row is enqueued as a separate job via `job_queue.enqueue()`
- `batch_id` is returned immediately
- `GET /batch/{batch_id}` returns status with per-row results, cost tracking, cache stats
- Results include `cost.equivalent_api_usd` for cost verification

### Data Field Flexibility

The classify skill should handle flexible input. Rows may have:
- `title` -- job title to normalize
- `company_description` -- free text about what the company does
- `industry` -- existing industry label to normalize
- `company_name` -- company name (can hint at industry)

If a field is missing, the skill should output `null` for the corresponding normalized fields and set confidence to 0.0 for that field. This follows the existing pattern where skills "work with what you have."

### Anti-Patterns to Avoid

- **Loading client profiles for classify**: The classify skill is data-in/data-out. It does not need to know about client value props, campaign angles, or tone preferences. Adding `context:` refs would bloat the prompt and waste tokens.
- **Hardcoding model name in frontmatter**: Use `model_tier: light` not `model: haiku`. This follows the convention and respects the `model_tier_map` in config, allowing the team to swap haiku for a future faster model without editing skills.
- **Creating a new API endpoint**: The existing `POST /batch` with `skill: "classify"` is the correct entry point. No new router needed.
- **Adding classify to SKILL_CLIENT_SECTIONS**: Only add if the skill actually loads client profiles. If it doesn't (and it shouldn't), no entry is needed. An entry with an empty list would cause `filter_client_profile()` to return an empty string.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Batch processing | Custom row-by-row loop | Existing `POST /batch` API | Already handles queuing, status tracking, cost estimation, caching |
| Model selection | Hardcode model in skill | `model_tier: light` in frontmatter | Model router handles the mapping; allows config-level override |
| JSON output enforcement | Custom output parser | Context assembler's JSON system prompt | Layer 1 of `build_prompt()` already says "Return ONLY valid JSON" |
| Cost tracking | Manual cost calculation | `token_estimator.py` + batch status endpoint | Already calculates per-row and total cost |
| Retry on failure | Custom retry logic | `retry_worker.py` + job queue | Background retry worker handles transient failures automatically |

## Common Pitfalls

### Pitfall 1: Prompt Too Large for Haiku
**What goes wrong:** Including knowledge base files, writing style guides, or client profiles inflates the prompt beyond what haiku needs for simple classification.
**Why it happens:** Following the pattern of content-generation skills (email-gen loads 5+ context files).
**How to avoid:** Use `skip_defaults: true` and `semantic_context: false` in frontmatter. No `context:` list. The skill.md itself is the entire prompt context.
**Warning signs:** Prompt token estimate > 500 tokens for a classify call.

### Pitfall 2: Inconsistent Seniority Labels
**What goes wrong:** Haiku returns "Vice President" sometimes and "VP" other times, or "Individual Contributor" vs "IC".
**Why it happens:** Without explicit enumeration in the skill prompt, the LLM may use synonyms.
**How to avoid:** Explicitly list the exact allowed values in the Output Format section and in the Rules: "MUST be exactly one of: IC, Manager, Director, VP, C-Suite, Unknown". Include 2-3 examples showing the exact format.
**Warning signs:** Downstream code that parses `title_normalized` breaks on unexpected values.

### Pitfall 3: Missing Fields Cause Errors
**What goes wrong:** A row with only `title` (no company data) causes the skill to either error or hallucinate an industry.
**Why it happens:** The skill tries to fill every output field regardless of input.
**How to avoid:** Skill rules must explicitly handle partial data: "If a field is not provided in the input, set the corresponding normalized value to null and confidence to 0.0."
**Warning signs:** Industry classifications appearing for rows that had no company information.

### Pitfall 4: Forgetting Context Filter Registration
**What goes wrong:** Adding `classify` to `SKILL_CLIENT_SECTIONS` with an empty list, which causes the filter to strip all content from client profiles.
**Why it happens:** Following the convention that "every skill needs an entry."
**How to avoid:** Only add an entry if the skill actually loads client profiles via `context:` frontmatter. Classify does not, so no entry is needed.
**Warning signs:** Test `test_all_15_skills_in_map` in `test_context_filter.py` (line 347) will fail because it expects exactly 15 skills. If classify is added, this test needs updating too.

### Pitfall 5: Testing with Real API Instead of Unit Tests
**What goes wrong:** Only testing via `curl` means tests are slow, non-deterministic, and depend on haiku availability.
**Why it happens:** The project's testing convention historically was "manual testing via curl" (per backend rules).
**How to avoid:** Write pytest unit tests that mock the claude executor and verify the skill loads correctly, the frontmatter parses properly, and the output schema matches expectations.
**Warning signs:** No test file for the classify skill in the test suite.

## Code Examples

### Classify Skill Frontmatter (Verified Pattern)

Based on the archived `icp-scorer` skill which used `model_tier: light`:

```yaml
---
model_tier: light
skip_defaults: true
semantic_context: false
---
```

Source: `skills/_archived/icp-scorer/skill.md` line 2

### Model Tier Resolution (Verified)

```python
# From app/config.py line 30
model_tier_map = {"light": "haiku", "standard": "sonnet", "heavy": "opus"}

# From app/core/model_router.py lines 47-49
tier = config.get("model_tier")
if tier and tier in settings.model_tier_map:
    return settings.model_tier_map[tier]
```

Source: `app/core/model_router.py`

### Batch API Request (Verified)

```python
# From app/models/requests.py
class BatchRequest(BaseModel):
    skill: str | None = Field(None, description="Skill name to run on all rows")
    rows: list[dict] = Field(..., description="Array of row data objects")
    model: str | None = Field(None, description="Model override")
    instructions: str | None = Field(None, description="Optional instructions for all rows")
```

Source: `app/models/requests.py` lines 27-36

### Skill Auto-Discovery (Verified)

```python
# From app/core/skill_loader.py
def list_skills() -> list[str]:
    return sorted(
        d.name
        for d in settings.skills_dir.iterdir()
        if d.is_dir() and (d / "skill.md").exists()
    )
```

No registration needed. Creating `skills/classify/skill.md` makes it discoverable.
Source: `app/core/skill_loader.py` lines 12-19

### Cost Estimation (Verified)

```python
# From app/core/token_estimator.py
MODEL_PRICING = {
    "haiku": {"input": 0.25, "output": 1.25},
}
# For classify: ~500 input tokens, ~100 output tokens
# Cost: (500/1M * 0.25) + (100/1M * 1.25) = $0.000125 + $0.000125 = $0.00025/row
```

Source: `app/core/token_estimator.py` lines 1-5

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `icp-scorer` skill (archived) | New `classify` skill | 2026-03-09 | ICP scorer was too specific; classify is general-purpose normalization |
| `model_tier: standard` on most skills | `model_tier: light` for classification | Existing pattern | Light tier is correct for simple classification tasks |
| Regex-based title parsing | LLM-based classification via haiku | This phase | Handles messy, multilingual, abbreviated titles gracefully |

**Key insight:** The archived `icp-scorer` (light tier, minimal context, classification output) is the closest existing pattern to what classify needs. The new skill is simpler -- it classifies without scoring.

## Open Questions

1. **Should classify support batch-level instructions?**
   - What we know: The batch API already supports `instructions` field passed to every row
   - What's unclear: Should classify accept custom seniority levels or industry verticals via instructions?
   - Recommendation: Support it as optional override. Default taxonomy is built into the skill; `instructions` can customize (e.g., "Also include 'Fellow' as a seniority level for research organizations"). Low effort since the context assembler already handles it.

2. **Should classify handle multi-value fields?**
   - What we know: Some contacts have titles like "CEO & Founder" or "VP Sales / VP Marketing"
   - What's unclear: Should the output be the highest seniority or list all?
   - Recommendation: Return the highest seniority level. Skill rules should say "For compound titles, classify by the highest seniority role." This keeps the output schema simple and predictable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (existing, 2268 tests passing) |
| Config file | `tests/conftest.py` |
| Quick run command | `source .venv/bin/activate && python -m pytest tests/test_skill_classify.py -v` |
| Full suite command | `source .venv/bin/activate && python -m pytest tests/ --tb=short` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-01 | Classify normalizes job titles to seniority levels | unit | `python -m pytest tests/test_skill_classify.py::TestClassifySkill::test_skill_loads_and_parses -x` | No -- Wave 0 |
| SKILL-02 | Classify categorizes companies into industry verticals | unit | `python -m pytest tests/test_skill_classify.py::TestClassifySkill::test_output_schema_has_industry_fields -x` | No -- Wave 0 |
| SKILL-03 | Output includes original, normalized, confidence per field | unit | `python -m pytest tests/test_skill_classify.py::TestClassifySkill::test_output_schema_structure -x` | No -- Wave 0 |
| SKILL-04 | Uses haiku model tier | unit | `python -m pytest tests/test_skill_classify.py::TestClassifySkill::test_model_tier_is_light -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `python -m pytest tests/test_skill_classify.py -v`
- **Per wave merge:** `python -m pytest tests/ --tb=short`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_skill_classify.py` -- covers SKILL-01, SKILL-02, SKILL-03, SKILL-04
  - Test that `skills/classify/skill.md` exists and parses valid frontmatter
  - Test that frontmatter has `model_tier: light`
  - Test that `skip_defaults: true` is set
  - Test that output format section defines required fields (title_original, title_normalized, title_confidence, industry_original, industry_normalized, industry_confidence, confidence_score)
  - Test that model_router resolves `light` tier to `haiku`

## Sources

### Primary (HIGH confidence)
- `app/core/skill_loader.py` -- skill auto-discovery, frontmatter parsing, context loading
- `app/core/model_router.py` -- model tier mapping (light -> haiku)
- `app/core/context_filter.py` -- SKILL_CLIENT_SECTIONS registry
- `app/core/context_assembler.py` -- 6-layer prompt builder
- `app/core/token_estimator.py` -- haiku pricing ($0.25/M input, $1.25/M output)
- `app/routers/batch.py` -- batch API (POST /batch, GET /batch/{id})
- `app/models/requests.py` -- BatchRequest model
- `app/config.py` -- model_tier_map configuration
- `skills/_archived/icp-scorer/skill.md` -- closest existing pattern (light tier, classification)
- `skills/company-research/skill.md` -- example of skip_defaults + lean frontmatter
- `docs/skills-guide.md` -- skill authoring template and conventions

### Secondary (MEDIUM confidence)
- `skills/_archived/qualifier/skill.md` -- alternative classification pattern (more complex, used standard tier)

### Tertiary (LOW confidence)
- None -- all findings verified from codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components verified in existing codebase, no new dependencies
- Architecture: HIGH -- follows exact patterns of existing skills (especially archived icp-scorer)
- Pitfalls: HIGH -- based on observed patterns in 15 active skills and 6 archived skills
- Cost estimate: HIGH -- haiku pricing confirmed from token_estimator.py, estimated at $0.00025/row (40x under $0.01 threshold)

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- no external dependencies, internal codebase patterns)
