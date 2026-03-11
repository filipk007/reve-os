# HubSpot Parent-Child Company Routing — Proposal

**Prepared for:** Sean Graham & 12 Labs Team
**Date:** March 11, 2026
**From:** Fermin

---

## The Problem

When contacts share a parent company email domain (e.g., @nfl.com), HubSpot auto-associates them to the parent company. But many of these contacts actually work for subsidiaries or child companies (e.g., Kansas City Chiefs, Dallas Cowboys). This causes:

- Contacts sitting on the wrong company record
- Reps not knowing who actually belongs to which team/subsidiary
- Owner assignment based on incorrect company data

---

## Proposed Solution — 3 Parts

### Part 1: Discovery & Assessment

**Goal:** Identify which parent companies have child/subsidiary relationships, and let the team decide how to handle each one.

**How it works:**

1. **Claude analyzes your HubSpot data** — We feed it a parent company and its contacts. Claude cross-references LinkedIn data, job titles, and company names to identify potential child companies grouped under that parent.

2. **Output a review spreadsheet** — Each row is a potential child company with:
   - Child company name (e.g., "Kansas City Chiefs")
   - Number of contacts found
   - How we detected it (LinkedIn URL, job title, etc.)
   - Suggested action: **Create as child** or **Merge with parent**
   - The basis for the suggestion (type, segment, company size)

3. **Team reviews and decides** — Your team marks each row:
   - **Approve as child** — create a separate company record
   - **Merge with parent** — keep contacts on the parent record, no separate company needed
   - **Special consideration** — flag for unique workflow needs (e.g., "This is a partner, not a subsidiary")

4. **Room for team input** — The spreadsheet includes a notes column for the team to add context that only they would know. The system doesn't make final decisions — your team does.

**The NFL example:** Claude would output something like:

| Child Company | Contacts | Detection | Suggested Action | Notes |
|--------------|----------|-----------|-----------------|-------|
| Kansas City Chiefs | 12 | LinkedIn URL + job titles | Create as child | — |
| Dallas Cowboys | 8 | LinkedIn URL | Create as child | — |
| NFL Films | 3 | LinkedIn URL | Team decision | Small — merge or keep? |
| NFL Network | 2 | Job title only | Team decision | Media arm — special workflow? |

---

### Part 2: Automated Association

**Goal:** Take the team's approved decisions and execute them automatically — no manual HubSpot work.

**How it works:**

1. **Import approved spreadsheet into Clay** — The reviewed spreadsheet becomes the source of truth.

2. **Clay creates child companies in HubSpot** — For each approved child:
   - Creates the company record via HubSpot API
   - Sets the parent-child relationship
   - Copies relevant properties from the parent

3. **Clay re-associates contacts** — For each contact that belongs to a child:
   - Removes the incorrect parent association
   - Associates them with the correct child company
   - Preserves all other contact data

4. **Mapping table maintained** — Clay keeps a running list of parent → child mappings so future contacts are routed correctly from day one.

**Edge case handling (the NFL problem):**
- If a contact lists the parent company on LinkedIn (e.g., "NFL" instead of "Kansas City Chiefs"), we can't auto-detect the correct child.
- **Pragmatic approach:** These contacts stay on the parent record. Their job title is visible to reps (e.g., "Director of Entertainment Teams - Kansas City Chiefs"), so reps can manually associate if needed.
- **Optional upgrade:** We can add a title-based detection layer later that scans for child company names in job titles. This catches cases like "Director — Kansas City Chiefs" even when LinkedIn says "NFL."

---

### Part 3: Lead Enrichment & Smart Check

**Goal:** When new leads come into HubSpot, use LinkedIn data to connect them to the right company — not just their email domain or the spreadsheet info.

**The problem today:** Contact-to-company association relies on:
- Email domain (unreliable for parent-child situations)
- Company info from team-provided spreadsheets (may be outdated or generic)

**The fix — LinkedIn-based enrichment checks:**

When a new contact enters the system, Clay enriches them and runs 3 checks:

1. **LinkedIn Company URL** — Does the contact's LinkedIn profile show a company URL that matches a known child in our mapping table? If yes, associate to the child instead of the parent.

2. **LinkedIn Company Name** — Does the current experience company name differ from the email domain company? If the contact's email is @nfl.com but LinkedIn says "Kansas City Chiefs," flag the mismatch.

3. **LinkedIn Profile URL** — Cross-reference the contact's own LinkedIn URL against enrichment data to confirm the company match is current (not a past employer).

**What happens with the results:**
- **Match found** → Auto-associate contact to the correct child company
- **Mismatch detected but uncertain** → Flag for manual review (rep gets a task)
- **No LinkedIn data available** → Default to email domain association (same as today), flag as low confidence

---

### Part 4: HubSpot Automations (Supporting)

**Goal:** Build lightweight HubSpot workflows that flag or route contacts who might be in the wrong spot.

**Suggested automations:**

1. **Mismatch alert workflow** — When a contact's `job_title` contains a known child company name but they're associated with the parent company → create a task for the assigned rep to review.

2. **New contact under parent flag** — When a new contact is created under a known parent company (one that has children) → add to a "Needs Routing Review" list so the team can spot-check.

3. **Confidence-based routing** — Contacts marked as "low confidence" by Clay get added to a review queue instead of auto-assigned to an owner. Prevents reps from getting mis-routed leads.

4. **Re-association audit** — Weekly report showing contacts whose company association was manually changed by a rep. High volume of manual changes = signal that auto-routing needs tuning for that parent.

---

## Implementation Timeline

| Phase | What | Effort | Dependency |
|-------|------|--------|------------|
| 1. Discovery | Claude analyzes parents, outputs review spreadsheet | 1 week | List of parent companies to analyze |
| 2. Team Review | Team reviews and marks decisions | Team's pace | Completed discovery output |
| 3. Automated Association | Clay executes approved decisions via HubSpot API | 1 week | Approved spreadsheet from team |
| 4. Lead Enrichment | Clay smart check on new inbound contacts | 1 week | Mapping table from Phase 3 |
| 5. HubSpot Automations | Mismatch alerts, review queues, audit reports | 3-5 days | Phases 3-4 complete |

**Total estimated build time:** ~3-4 weeks (excluding team review time)

---

## What We Need From the Team

1. **List of parent companies** to start the discovery analysis
2. **Time to review** the discovery spreadsheet and make approve/merge decisions
3. **Industry-to-Segment mapping** (if used for owner routing)
4. **Confirmation** on which HubSpot automations are highest priority

---

## Next Steps

1. Align on this proposal
2. Start Phase 1 discovery with 2-3 pilot parent companies
3. Review output together, refine the process
4. Scale to all parent companies
