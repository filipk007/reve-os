---
phase: 1
slug: classify-skill
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (existing, 2268 tests passing) |
| **Config file** | `tests/conftest.py` |
| **Quick run command** | `source .venv/bin/activate && python -m pytest tests/test_skill_classify.py -v` |
| **Full suite command** | `source .venv/bin/activate && python -m pytest tests/ --tb=short` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest tests/test_skill_classify.py -v`
- **After every plan wave:** Run `python -m pytest tests/ --tb=short`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | SKILL-01, SKILL-02, SKILL-03, SKILL-04 | unit | `python -m pytest tests/test_skill_classify.py -v` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | SKILL-01 | unit | `python -m pytest tests/test_skill_classify.py::TestClassifySkill::test_skill_loads_and_parses -x` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | SKILL-02 | unit | `python -m pytest tests/test_skill_classify.py::TestClassifySkill::test_output_schema_has_industry_fields -x` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | SKILL-03 | unit | `python -m pytest tests/test_skill_classify.py::TestClassifySkill::test_output_schema_structure -x` | ❌ W0 | ⬜ pending |
| 01-02-04 | 02 | 1 | SKILL-04 | unit | `python -m pytest tests/test_skill_classify.py::TestClassifySkill::test_model_tier_is_light -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_skill_classify.py` — stubs for SKILL-01, SKILL-02, SKILL-03, SKILL-04
  - Test that `skills/classify/skill.md` exists and parses valid frontmatter
  - Test that frontmatter has `model_tier: light`
  - Test that `skip_defaults: true` is set
  - Test that output format section defines required fields
  - Test that model_router resolves `light` tier to `haiku`

*Existing `tests/conftest.py` covers shared fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Haiku returns consistent seniority labels | SKILL-01 | LLM output non-deterministic | Send 10 rows via `POST /batch` with known titles, verify all return exact enum values |
| Industry classification accuracy | SKILL-02 | LLM judgment varies | Send 10 rows with known companies, verify verticals match expectations |
| Cost under $0.01/row | SKILL-04 | Requires live API pricing | Check `cost.equivalent_api_usd` in batch response for 10-row batch |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
