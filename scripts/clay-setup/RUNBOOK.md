# Phase 2 Runbook — All-in-Clay: Detection, Association, Dedup & Routing

**Project:** HubSpot Parent-Child Contact Routing
**Client:** 12 Labs
**Phase:** 2 — All-in-Clay
**Status:** NOT STARTED

---

## Quick Reference

| Deliverable | What it does | When to use |
|-------------|-------------|-------------|
| `06-create-routing-properties.sh` | Create `company_association_resolved` + `routing_confidence` in HubSpot | Wave 1, before Clay setup |
| `contact-routing-table-spec.md` | Full column spec for the Clay routing table | Reference during Clay build |
| `hubspot-api-templates.md` | Copy-paste HTTP Request configs for Clay | When building HTTP Request columns |
| `mapping-table-guide.md` | Set up the LinkedIn URL → Company ID mapping table | Wave 2, before routing table |
| `dedup-test-plan.md` | 15 test scenarios for dedup + Smart Compare | Wave 5, after table is built |
| `07-weekly-dedup-scan.sh` | Automated weekly duplicate detection | Wave 4, ongoing |

**Environment variable required:**
```bash
export HUBSPOT_ACCESS_TOKEN="pat-na1-xxxxxxxxxxxx"
```

---

## Wave 1: HubSpot Properties (Day 1)

### Task 1.1: Create Routing Properties in HubSpot
**Type:** Automated (script)
**Status:** [ ] Not started | [ ] In progress | [ ] Complete

```bash
# Dry run first
export HUBSPOT_ACCESS_TOKEN="pat-na1-xxxxxxxxxxxx"
DRY_RUN=true bash scripts/hubspot-setup/06-create-routing-properties.sh

# If dry run looks right, run for real
bash scripts/hubspot-setup/06-create-routing-properties.sh
```

**Verification (HubSpot UI):**
1. Settings → Properties → search "company_association_resolved"
   - [ ] Appears under Contacts, group: Contact Routing
   - [ ] Type: Boolean checkbox
2. Settings → Properties → search "routing_confidence"
   - [ ] Appears under Contacts, group: Contact Routing
   - [ ] Type: Dropdown select (high/medium/low)

---

## Wave 2: Clay Mapping Table (Day 1-2)

**Dependency:** Phase 1 mapping table data exists (from `04-extract-child-companies.sh`)

### Task 2.1: Create or Verify Mapping Table
**Type:** MANUAL — Clay UI
**Status:** [ ] Not started | [ ] In progress | [ ] Complete

If the mapping table was created in Phase 1, verify it's populated. If not, follow `mapping-table-guide.md`.

**Checklist:**
- [ ] Table exists in Clay workspace
- [ ] Has 5 columns: `linkedin_company_url`, `hubspot_company_id`, `company_name`, `parent_company_name`, `parent_domain`
- [ ] `linkedin_company_url` is the key/match column
- [ ] Rows populated for pilot parent children
- [ ] URLs are normalized (no protocol, no www, no trailing slash)

**Clay table URL:** _____________________

---

## Wave 3: Build Contact Routing Table (Day 2-7)

**Dependency:** Wave 1 + Wave 2 complete

This is the main build. Follow `contact-routing-table-spec.md` for every column. Build in order — later columns depend on earlier ones.

### Task 3.1: Create Table + Enrichment Columns (Steps 1)
**Type:** MANUAL — Clay UI
**Status:** [ ] Not started | [ ] In progress | [ ] Complete

1. Create new Clay table: **"Contact Routing"**
2. Input column: `email` (text)
3. Add enrichment columns (Clay's "Enrich Person"):
   - [ ] `email_domain` — formula: extract domain from email
   - [ ] `linkedin_company_url` — enrichment: LinkedIn company URL
   - [ ] `linkedin_company_name` — enrichment: company name
   - [ ] `job_title` — enrichment: job title
   - [ ] `headline` — enrichment: LinkedIn headline
   - [ ] `all_current_roles` — enrichment: all current positions

**Test:** Add 3 test emails from known pilot domain contacts. Verify enrichment returns expected data.

**Test results:**
| Email | LinkedIn URL | Company Name | Job Title | Pass? |
|-------|-------------|-------------|-----------|-------|
| | | | | |
| | | | | |
| | | | | |

---

### Task 3.2: Smart Compare Columns (Step 2)
**Type:** MANUAL — Clay UI (formula + lookup columns)
**Status:** [ ] Not started | [ ] In progress | [ ] Complete

Build in priority order:

1. **`primary_url_match`** (Lookup)
   - [ ] Lookup `linkedin_company_url` against mapping table
   - [ ] Returns `hubspot_company_id`
   - [ ] Test: known child URL returns correct ID

2. **`title_company_extract`** (Formula)
   - [ ] Check `job_title` for exact substring match against mapping table `company_name` values
   - [ ] Only runs when `primary_url_match` is empty
   - [ ] Test: "Director of Entertainment Teams - Kansas City Chiefs" → matches "Kansas City Chiefs"
   - [ ] Test: "KC Chiefs liaison" → does NOT match (no abbreviations)

3. **`multirole_match`** (Formula/Lookup)
   - [ ] Iterate `all_current_roles[].company_url` against mapping table
   - [ ] Returns first matching `hubspot_company_id`
   - [ ] Test: secondary role with child company URL → match

4. **`headline_company_extract`** (Formula)
   - [ ] Extract text after "at " from headline
   - [ ] Match against mapping table `company_name` values
   - [ ] Test: "Entertainment Director at Kansas City Chiefs" → match

5. **`resolved_company_id`** (Formula — COALESCE)
   - [ ] First non-empty of: primary_url → title → multirole → headline
   - [ ] Test: multiple signals present → first one wins

---

### Task 3.3: Routing Logic Columns (Steps 3-4)
**Type:** MANUAL — Clay UI (formula columns)
**Status:** [ ] Not started | [ ] In progress | [ ] Complete

1. **`mismatch_detected`** (Formula — boolean)
   - [ ] Email domain company ≠ LinkedIn company
   - [ ] Test: @nfl.com + LinkedIn=Chiefs → true
   - [ ] Test: @nfl.com + LinkedIn=NFL → false

2. **`routing_confidence`** (Formula)
   - [ ] No LinkedIn URL → "low"
   - [ ] LinkedIn URL + resolved → "high"
   - [ ] LinkedIn URL + mismatch + no match → "medium"

3. **`routing_tag`** (Formula)
   - [ ] Low confidence → "review"
   - [ ] Resolved ID exists → "child:{id}"
   - [ ] Mismatch + no match → "new_child"
   - [ ] No mismatch → "parent"

---

### Task 3.4: HubSpot HTTP Request Columns (Steps 6-11)
**Type:** MANUAL — Clay UI (HTTP Request columns)
**Status:** [ ] Not started | [ ] In progress | [ ] Complete

Use `hubspot-api-templates.md` for copy-paste configurations.

Build in order:

1. **`hubspot_search_result`** (Step 6 — Search)
   - [ ] Runs when: `routing_tag = "new_child"`
   - [ ] Searches HubSpot for company by LinkedIn URL
   - [ ] Parse response: `results[0].id` and `total`

2. **`mapping_table_write`** (Step 7 — Claim URL)
   - [ ] Runs when: new child + not found in HubSpot search
   - [ ] Writes row to mapping table with LinkedIn URL + company info

3. **`hubspot_create_company`** (Step 8 — Create)
   - [ ] Runs when: truly new child (not in mapping table OR HubSpot)
   - [ ] Creates company with name + LinkedIn URL (NO domain!)
   - [ ] Parse response: `id` = new company ID

4. **`hubspot_verify_create`** (Step 9 — Race guard)
   - [ ] Runs when: company was just created
   - [ ] Searches HubSpot again for same LinkedIn URL
   - [ ] If `total > 1` → duplicate detected

5. **`hubspot_delete_duplicate`** (Step 9 — Cleanup)
   - [ ] Runs when: `duplicate_count > 1`
   - [ ] Deletes the higher-ID company (keeps first-created)

6. **`hubspot_associate`** (Step 10 — Link)
   - [ ] Runs when: `final_company_id` exists
   - [ ] PUT association between contact and company

7. **`hubspot_remove_wrong_assoc`** (Step 10 — Unlink parent)
   - [ ] Runs when: `mismatch_detected = true`
   - [ ] DELETE association between contact and parent company

8. **`hubspot_set_resolved`** (Step 11 — Flag)
   - [ ] Runs after association succeeds
   - [ ] PATCH contact: `company_association_resolved = true`

---

### Task 3.5: Decision Tree Columns (Step 12)
**Type:** MANUAL — Clay UI
**Status:** [ ] Not started | [ ] In progress | [ ] Complete
**Dependency:** Sean's Industry → Segment mapping (can stub with defaults)

1. **`region`** — Enrichment/formula for APAC detection
   - [ ] Configured

2. **`company_type`** — Lookup from HubSpot company properties
   - [ ] HTTP Request to get company `type` property
   - [ ] Or: lookup from mapping table if available

3. **`industry`** — Clay enrichment
   - [ ] Configured

4. **`segment`** — Lookup against Industry→Segment mapping
   - [ ] Mapping table created (from Sean's data)
   - [ ] OR: stubbed with default "Unassigned" for now

5. **`assigned_owner_id`** — Decision tree formula
   - [ ] APAC → APAC owner ID
   - [ ] Partner → Partnership team ID
   - [ ] Segment → Segment owner ID
   - [ ] Default → catch-all owner ID

6. **`hubspot_assign_owner`** — HTTP Request
   - [ ] PATCH contact with `hubspot_owner_id`

**DECISION GATE:** If Sean hasn't provided the Industry → Segment mapping yet, stub the segment lookup with a default owner. The routing table can go live for association+dedup without the full decision tree.

---

## Wave 4: Automation & Monitoring (Day 7-10)

### Task 4.1: Set Up Weekly Dedup Scan
**Type:** Automated (script + cron or manual)
**Status:** [ ] Not started | [ ] In progress | [ ] Complete

```bash
# Test the scan first
bash scripts/clay-setup/07-weekly-dedup-scan.sh

# Schedule weekly (every Monday at 9 AM ET)
# Add to crontab: 0 9 * * 1 bash /path/to/scripts/clay-setup/07-weekly-dedup-scan.sh
```

**First scan result:**
- Total companies with LinkedIn URL: _____
- Duplicate groups found: _____
- Action taken: _____

---

### Task 4.2: Configure Clay Table Trigger
**Type:** MANUAL — Clay UI
**Status:** [ ] Not started | [ ] In progress | [ ] Complete

Configure how contacts enter the routing table:
- [ ] **Option A:** Clay integration with HubSpot — new contacts auto-added
- [ ] **Option B:** Webhook trigger from HubSpot → Clay
- [ ] **Option C:** Manual import for pilot testing, automate later

**Trigger configured:** _____________________

---

## Wave 5: Testing (Day 8-14)

### Task 5.1: Run Dedup Test Plan
**Type:** Manual testing
**Status:** [ ] Not started | [ ] In progress | [ ] Complete

Follow `dedup-test-plan.md` for all 15 test scenarios.

**Test summary:**

| Test # | Description | Result | Notes |
|--------|------------|--------|-------|
| 1 | Single contact, new child | | |
| 2 | Sequential, same subsidiary | | |
| 3 | Parallel, same subsidiary | | |
| 4 | Known child in mapping table | | |
| 5 | Clay key dedup behavior | | |
| 6 | HubSpot indexing delay | | |
| 7 | Weekly dedup scan | | |
| 8 | Smart Compare: URL match | | |
| 9 | Smart Compare: title rescue | | |
| 10 | Smart Compare: multi-role | | |
| 11 | Smart Compare: headline | | |
| 12 | All signals = parent | | |
| 13 | Parent domain, no mismatch | | |
| 14 | No LinkedIn data | | |
| 15 | Title match strictness | | |

**All tests passing?** [ ] Yes → proceed to pilot | [ ] No → fix issues first

---

## Wave 6: Pilot (Day 14+)

### Task 6.1: Pilot with 50 Contacts
**Type:** Manual + monitoring
**Status:** [ ] Not started | [ ] In progress | [ ] Complete

1. Select 50 contacts from pilot parent domains
2. Run through the routing table
3. Verify associations in HubSpot UI

**Pilot results:**
- Contacts processed: _____
- Correctly routed: _____
- Sent to review queue: _____
- Errors: _____
- Accuracy: _____%

---

## Phase 2 Completion Checklist

- [ ] **HubSpot properties created:** `company_association_resolved` + `routing_confidence` exist
- [ ] **Mapping table populated:** All pilot child companies with normalized LinkedIn URLs
- [ ] **Routing table built:** All 33 columns configured per spec
- [ ] **Smart Compare working:** Title rescue, multi-role, and headline detection tested
- [ ] **Dedup layers active:** Mapping table → HubSpot search → verify-after-create → weekly scan
- [ ] **HTTP Requests working:** All 8 HubSpot API calls returning expected responses
- [ ] **Decision tree functional:** Owner assignment working (even if stubbed with defaults)
- [ ] **Weekly dedup scan scheduled:** Running every Monday
- [ ] **All 15 test scenarios passed:** See dedup-test-plan.md results
- [ ] **50-contact pilot completed:** Accuracy > 95%
- [ ] **Review queue operational:** Low-confidence contacts routed correctly

---

## Troubleshooting

### "HTTP Request column returns 401"
- HubSpot access token expired or not configured in Clay
- Go to Clay Settings → Integrations → check `HUBSPOT_ACCESS_TOKEN`
- Regenerate token in HubSpot → Settings → Integrations → Private Apps

### "Smart Compare: title match not finding known child"
- Company name in mapping table must exactly match the substring in the title
- Check for extra whitespace, capitalization differences
- Verify the mapping table `company_name` column is clean
- Remember: v1 is exact substring only — "KC Chiefs" won't match "Kansas City Chiefs"

### "Duplicate company created despite dedup layers"
- Race condition beat the verify-after-create check (HubSpot indexing delay)
- Run `07-weekly-dedup-scan.sh` to find and flag duplicates
- Manually merge in HubSpot (merges are irreversible — verify before merging)

### "Contact not entering routing table"
- Check Clay table trigger configuration (Task 4.2)
- Verify contact meets entry criteria (has email, is from opted-out domain)
- Check Clay table run history for errors

### "HubSpot search returns 0 but company exists"
- HubSpot Search API has ~1-2 second indexing delay for newly created records
- The verify-after-create step accounts for this, but edge cases remain
- Weekly dedup scan is the final safety net

### "association returns 404"
- Contact ID or company ID is invalid
- Verify IDs exist: `curl -s https://api.hubapi.com/crm/v3/objects/contacts/{id} -H "Authorization: Bearer $TOKEN"`
- Check if the contact/company was merged or deleted

### "Decision tree assigns wrong owner"
- Check priority order: Region (APAC) → Type (Partner) → Segment
- Verify Industry → Segment mapping is correct
- Check if company `type` property is set correctly in HubSpot

---

## Notes & Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| | | |
