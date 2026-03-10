# HubSpot Parent-Child Routing — Roadmap

## Milestone 1: Core Routing System

### Phase 1: Setup & Prerequisites
**Goal:** Prepare HubSpot and Clay for the routing workflow

**Tasks:**
1. Add `linkedin_company_url` property to HubSpot Contact records (if not exists)
2. Add `linkedin_company_url` property to HubSpot Company records (child matching)
3. Add `routing_tag` property to HubSpot Contact records (parent | child:{id} | new_child)
4. Identify top 10-20 most problematic parent domains for pilot
5. Add pilot domains to HubSpot "Opted-out domains" list
6. Build initial LinkedIn URL → Child Company ID mapping table in Clay
7. Populate mapping table for existing child companies under pilot parents
8. Get Industry → Segment mapping from Sean

**Success Criteria:**
- Opted-out domains block auto-association for pilot parents
- Mapping table has LinkedIn URLs for all existing children under pilot parents
- All required HubSpot properties exist

**Dependencies:** Sean provides industry-segment mapping + confirms LinkedIn URL field availability

---

### Phase 2: Clay Detection & Tagging
**Goal:** Clay enriches contacts, detects mismatches, and tags them before pushing to HubSpot

**Tasks:**
1. Configure Clay enrichment to output `email_domain` and `linkedin_company_url` as separate fields
2. Add comparison formula column: does email domain company = LinkedIn company?
3. Add lookup column: check LinkedIn URL against mapping table
4. Add tagging logic:
   - No mismatch → tag: `parent`
   - Mismatch + found in lookup → tag: `child:{hubspot_company_id}`
   - Mismatch + not found → tag: `new_child`
5. Configure Clay → HubSpot push with routing tag
6. Test with 50 contacts from pilot parent companies

**Success Criteria:**
- Clay correctly identifies mismatches for test contacts
- Tags are accurate (verified against known associations)
- Push to HubSpot includes routing tag

**Dependencies:** Phase 1 complete, Clay enrichment access

---

### Phase 3: HubSpot Workflow (Association + Dedup Guard)
**Goal:** HubSpot reads tags and associates contacts to the correct company

**Tasks:**
1. Create Ops Hub workflow triggered on new contact with routing tag
2. Branch 1 — `parent` tag: Associate to parent company via domain
3. Branch 2 — `child:{id}` tag: Associate to child company by ID
4. Branch 3 — `new_child` tag:
   a. **Dedup Guard:** Search HubSpot Companies API for existing company with LinkedIn URL
   b. If found → associate to existing child, update Clay lookup table
   c. If not found → create child company (name from LinkedIn, parent association, LinkedIn URL property)
   d. Associate contact to new child, update Clay lookup table
5. After association: Run decision tree for owner assignment
   a. Check Region (APAC?)
   b. Check Type (Partner?)
   c. Map Industry → Segment → Assign owner
6. Test full flow end-to-end with pilot contacts

**Success Criteria:**
- Contacts correctly associated to child companies (not parents)
- No duplicate child companies created (dedup guard working)
- Owners assigned correctly via decision tree
- Clay lookup table updated after new child creation

**Dependencies:** Phase 2 complete, Ops Hub access, decision tree logic confirmed

---

### Phase 4: Scale to All Parents
**Goal:** Expand from pilot to all 100+ parent companies

**Tasks:**
1. Add remaining ~90 parent domains to opted-out list
2. Populate mapping table with LinkedIn URLs for all existing children
3. Build domain alias table for parents with multiple domains (amazon.com + amazon.co.jp)
4. Run batch backfill: re-process existing contacts under newly opted-out domains
5. Monitor for 2 weeks: check association accuracy, duplicate rate, review queue volume

**Success Criteria:**
- All 100+ parent domains opted out and routed through workflow
- Association accuracy >95%
- Duplicate child creation rate <1%
- Domain aliases correctly mapped

**Dependencies:** Phase 3 proven on pilot, domain alias list compiled

---

### Phase 5: Ongoing Detection (New Parents)
**Goal:** Automatically detect when a company needs parent-child treatment

**Tasks:**
1. Build Clay periodic scan: group contacts by email domain
2. Count distinct LinkedIn Company URLs per domain
3. Flag domains with 2+ distinct LinkedIn companies as potential new parents
4. Alert ops team when new parent-child relationship detected
5. Semi-automated flow: create parent structure, add to opted-out list, populate mapping
6. Weekly dedup report: group companies by `linkedin_company_url`, flag count > 1

**Success Criteria:**
- New parent-child relationships detected within 1 week of first signal
- No manual monitoring required for parent detection
- Weekly dedup catches any edge case duplicates

**Dependencies:** Phase 4 complete and stable

---

## Phase Summary

| Phase | What | Where | Est. Effort | Blocked By |
|-------|------|-------|-------------|------------|
| 1 | 1/1 | Complete   | 2026-03-10 | Sean's mapping table |
| 2 | Clay Detection & Tagging | Clay | 1-2 weeks | Phase 1 |
| 3 | HubSpot Workflow + Dedup | HubSpot Ops Hub | 2-3 weeks | Phase 2 |
| 4 | Scale to All Parents | Both | 1-2 weeks | Phase 3 proven |
| 5 | Ongoing Detection | Clay | 1 week | Phase 4 stable |

**Total estimated:** 6-9 weeks from Phase 1 start

## Current Blocker
Waiting on Sean Graham for:
1. Industry → Segment mapping table
2. Confirmation that LinkedIn Company URL flows from Clay to HubSpot
3. Manager alignment on the approach
