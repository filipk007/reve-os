---
phase: 01-setup-prerequisites
plan: "01"
subsystem: infra
tags: [hubspot, clay, crm, bash-scripts, csv, runbook]

# Dependency graph
requires: []
provides:
  - HubSpot property audit script (checks linkedin_company_url + routing_tag existence)
  - HubSpot pilot parent discovery script (fallback ranking by child count)
  - LinkedIn URL data verification script (determines if Clay enrichment needed)
  - HubSpot property creation script (groups + 3 custom properties, idempotent)
  - Domain alias checker script (for opted-out domain completeness)
  - Child company extraction script (paginated, CSV output, URL normalization)
  - Clay mapping table CSV template (5-column schema with sample rows)
  - Phase 1 operator runbook (all tasks, status checkboxes, troubleshooting)
affects: [02-clay-detection, 03-hubspot-workflow]

# Tech tracking
tech-stack:
  added: [HubSpot CRM v3 API, HubSpot Associations v4 API, bash, python3]
  patterns:
    - Idempotent API scripts (409 conflict = already exists = success)
    - Dry-run mode via DRY_RUN=true env var
    - URL normalization in extraction (lowercase, strip trailing slash, force www prefix)
    - HUBSPOT_ACCESS_TOKEN env var convention for all scripts

key-files:
  created:
    - scripts/hubspot-setup/01-audit-properties.sh
    - scripts/hubspot-setup/01b-find-pilot-parents.sh
    - scripts/hubspot-setup/01c-verify-linkedin-data.sh
    - scripts/hubspot-setup/02-create-properties.sh
    - scripts/hubspot-setup/03-check-domain-aliases.sh
    - scripts/hubspot-setup/04-extract-child-companies.sh
    - scripts/hubspot-setup/clay-mapping-table-template.csv
    - scripts/hubspot-setup/RUNBOOK.md
    - scripts/hubspot-setup/output/.gitkeep
  modified: []

key-decisions:
  - "fieldType=text not url for linkedin_company_url — url type auto-prepends https:// and breaks Clay lookup matching"
  - "Property creation uses groups (contact_routing) created before properties — required ordering"
  - "Opted-out domains are HubSpot UI-only — no API exists; runbook clearly flags this as manual step"
  - "Clay mapping table creation is UI-only — CSV import is the automation boundary; script produces the import-ready CSV"
  - "Wave 5 (Sean's deliverables) does not block Phase 2 — industry-segment mapping is Phase 3 concern"
  - "Scripts use LINKEDIN_PROPERTY env var override so audit-discovered naming variants propagate cleanly"

patterns-established:
  - "HubSpot script pattern: HUBSPOT_ACCESS_TOKEN env var + idempotent create_or_skip helper"
  - "Output artifacts written to scripts/hubspot-setup/output/ (gitignored runtime data)"
  - "Runbook tracks manual vs. automated steps with checkboxes — operator fills in as they go"

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-03-10
---

# Phase 1: Setup & Prerequisites Summary

**HubSpot property setup automation + Clay mapping table pipeline via 6 parameterized bash scripts, a CSV template, and a complete operator runbook covering all 5 waves**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-10T22:22:32Z
- **Completed:** 2026-03-10T22:27:58Z
- **Tasks:** 5 script/doc deliverables
- **Files created:** 9

## Accomplishments

- Six executable bash scripts covering all automatable steps in Phase 1 (audit, fallback parent discovery, LinkedIn data check, property creation, domain alias check, child company extraction)
- Idempotent property creation script with dry-run mode — safe to re-run without creating duplicates
- Child company extractor normalizes LinkedIn URLs to canonical format (`https://www.linkedin.com/company/{slug}`) so Clay lookup matching works correctly
- Complete operator runbook with status checkboxes, decision gates, troubleshooting guide, and explicit callouts for the two UI-only manual steps (opted-out domains, Clay table creation)
- Wave 5 (Sean's deliverables) clearly marked BLOCKED with message templates — does not gate the rest of Phase 1

## Task Commits

1. **Wave 1 discovery scripts** - `345baa5` (feat)
2. **Wave 2 property creation script** - `25790d4` (feat)
3. **Wave 3 domain alias check** - `360ca4f` (feat)
4. **Wave 4 extraction script + CSV template** - `efbd713` (feat)
5. **Phase 1 runbook** - `5fdbda6` (feat)

## Files Created

- `scripts/hubspot-setup/01-audit-properties.sh` — Pre-flight check; finds naming variants; prevents duplicate property creation
- `scripts/hubspot-setup/01b-find-pilot-parents.sh` — Fallback: paginated HubSpot search ranks parents by child count; outputs ranked JSON + summary
- `scripts/hubspot-setup/01c-verify-linkedin-data.sh` — Samples 10 child companies; determines if Clay enrichment run needed before mapping table
- `scripts/hubspot-setup/02-create-properties.sh` — Creates contact_routing group (Contacts + Companies) and 3 custom properties; idempotent; dry-run mode
- `scripts/hubspot-setup/03-check-domain-aliases.sh` — Checks hs_additional_domains for each pilot parent; outputs complete opted-out domain list
- `scripts/hubspot-setup/04-extract-child-companies.sh` — Paginated child extraction per parent ID; normalizes LinkedIn URLs; outputs import-ready CSV
- `scripts/hubspot-setup/clay-mapping-table-template.csv` — 5-column Clay table schema with sample rows (NFL + Amazon examples)
- `scripts/hubspot-setup/RUNBOOK.md` — Complete operator checklist for all 13 tasks; manual vs. automated clearly marked; decision gates; troubleshooting
- `scripts/hubspot-setup/output/.gitkeep` — Placeholder for runtime output directory

## Decisions Made

- **fieldType=text not url:** The HubSpot `url` fieldType auto-prepends `https://` on save, which corrupts exact-match lookups in Clay. All LinkedIn URL properties use `string`/`text`.
- **Property groups first:** HubSpot requires the group to exist before properties can reference it. Script creates groups in Step 1, properties in Step 2.
- **Opted-out domains are UI-only:** Confirmed no HubSpot API exists for the exclusion list. Runbook explicitly flags this as a manual step with navigation path.
- **Wave 5 does not block Phase 2:** Industry→Segment mapping (Sean's deliverable) is needed for Phase 3 (HubSpot decision tree), not Phase 2 (Clay detection). Phase 2 can start after Phase 1's unblocked tasks complete.
- **LINKEDIN_PROPERTY env var override:** If the audit discovers an existing property with a different name (e.g., `linkedin_company_page`), all downstream scripts accept this override without code changes.

## Deviations from Plan

None — plan executed exactly as written. All scripts and the runbook correspond directly to tasks specified in PLAN.md.

## Issues Encountered

None.

## User Setup Required

All automation scripts require:
```bash
export HUBSPOT_ACCESS_TOKEN="pat-na1-xxxxxxxxxxxx"
```

Operator must get this token from HubSpot → Settings → Integrations → Private Apps.

**Required scopes:**
- `crm.schemas.contacts.write`
- `crm.schemas.companies.write`
- `crm.objects.contacts.read`
- `crm.objects.companies.read`

See `scripts/hubspot-setup/RUNBOOK.md` for the complete step-by-step execution guide.

## Next Phase Readiness

Phase 2 (Clay Detection & Tagging) can start once:
1. HubSpot properties exist (Wave 2 complete)
2. Mapping table is populated (Wave 4 complete)
3. Opted-out domains are active for pilot parents (Wave 3 complete)

Wave 5 (Sean's deliverables) does not block Phase 2. The segment routing logic lands in Phase 3.

## Self-Check: PASSED

All 9 files confirmed present on disk. All 5 task commits verified in git log.

---
*Phase: 01-setup-prerequisites*
*Completed: 2026-03-10*
