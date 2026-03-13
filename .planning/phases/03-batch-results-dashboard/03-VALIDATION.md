---
phase: 3
slug: batch-results-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (frontend — no jest/vitest configured) |
| **Config file** | none |
| **Quick run command** | `cd dashboard && npx next build` |
| **Full suite command** | `cd dashboard && npx next build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx next build`
- **After every plan wave:** Run `cd dashboard && npx next build`
- **Before `/gsd:verify-work`:** Build must succeed + manual verification of all 6 requirements
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | DASH-01 | manual + build | `cd dashboard && npx next build` | N/A | ⬜ pending |
| 03-01-02 | 01 | 1 | DASH-02 | manual + build | `cd dashboard && npx next build` | N/A | ⬜ pending |
| 03-01-03 | 01 | 1 | DASH-03 | manual + build | `cd dashboard && npx next build` | N/A | ⬜ pending |
| 03-01-04 | 01 | 1 | DASH-04 | manual + build | `cd dashboard && npx next build` | N/A | ⬜ pending |
| 03-02-01 | 02 | 1 | DASH-05 | manual + build | `cd dashboard && npx next build` | N/A | ⬜ pending |
| 03-02-02 | 02 | 1 | DASH-06 | manual + build | `cd dashboard && npx next build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework needed — project uses manual testing + `next build` type-checking for frontend per CLAUDE.md conventions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Data table renders batch rows | DASH-01 | No frontend test framework | Navigate to `/batch-results?id=<batch_id>` after running a batch, verify table displays rows |
| Click header sorts column | DASH-02 | UI interaction | Click column header, verify sort icon toggles and rows reorder |
| Filter narrows visible rows | DASH-03 | UI interaction | Type in search input, select status dropdown, verify row count changes |
| CSV download produces file | DASH-04 | File download | Click download button, open downloaded .csv, verify data matches table |
| Confidence coloring displays | DASH-05 | Visual verification | Run batch with email-gen/classify, verify green (≥0.7), yellow (0.4-0.7), red (<0.4) row backgrounds |
| Side panel opens on row click | DASH-06 | UI interaction | Click a completed row, verify Sheet slides in from right with email preview content |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
