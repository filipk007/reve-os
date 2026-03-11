# Phase 2: Dedup + Smart Compare Test Plan

**Purpose:** 15 test scenarios covering dedup race conditions, Smart Compare edge cases, and routing accuracy.

**Prerequisites:**
- Clay routing table built (all columns from `contact-routing-table-spec.md`)
- Mapping table populated with pilot data
- HubSpot API access configured in Clay
- At least 3 known child companies in the mapping table for testing

---

## Test Data Setup

Before running tests, create this test data:

### Mapping Table Entries (use real or test data)
```
linkedin.com/company/kansas-city-chiefs  → ID: {chiefs_id}  → "Kansas City Chiefs"  → NFL → nfl.com
linkedin.com/company/new-england-patriots → ID: {patriots_id} → "New England Patriots" → NFL → nfl.com
linkedin.com/company/amazon-web-services  → ID: {aws_id}      → "Amazon Web Services"  → Amazon → amazon.com
```

### Test Contacts
Prepare these contacts (or use real contacts from pilot domains):

| # | Email | LinkedIn URL | Job Title | Headline | Notes |
|---|-------|-------------|-----------|----------|-------|
| A | `test-a@nfl.com` | `linkedin.com/company/kansas-city-chiefs` | VP Operations | Operations at KC Chiefs | Known child, URL match |
| B | `test-b@nfl.com` | `linkedin.com/company/kansas-city-chiefs` | Director, Marketing | Marketing at Chiefs | Same child as A |
| C | `test-c@nfl.com` | `linkedin.com/company/nfl` | Dir of Entertainment Teams - Kansas City Chiefs | Entertainment at NFL | Parent URL, title rescue |
| D | `test-d@nfl.com` | `linkedin.com/company/nfl` | VP Strategy | Strategy at NFL | True parent |
| E | `test-e@nfl.com` | (empty) | Analyst | NFL Analyst | No LinkedIn data |
| F | `test-f@nfl.com` | `linkedin.com/company/new-subsidiary-test` | Manager | Manager at New Sub | New child (not in mapping) |
| G | `test-g@nfl.com` | `linkedin.com/company/nfl` | KC Chiefs liaison | Sports at NFL | Abbreviation (should NOT match) |

---

## Dedup Tests

### Test 1: Single Contact, No Existing Child → Creates Company
**Scenario:** Contact F arrives. Their LinkedIn URL is not in the mapping table or HubSpot.
**Expected flow:**
1. Enrichment → `linkedin.com/company/new-subsidiary-test`
2. Smart Compare → no match in mapping table
3. Mismatch detected → email @nfl.com ≠ LinkedIn "new-subsidiary-test"
4. HubSpot search → not found
5. Mapping table write → claims URL
6. HubSpot create → new company created
7. Verify → count = 1 (clean)
8. Associate → contact linked to new company
9. Set resolved → true

**Verify:**
- [ ] New company exists in HubSpot with name from LinkedIn
- [ ] Company has `linkedin_company_url` set
- [ ] Company does NOT have `domain: nfl.com`
- [ ] Contact is associated to new company (not NFL parent)
- [ ] `company_association_resolved = true`
- [ ] `routing_tag = "child:{new_id}"`
- [ ] Mapping table has new row

**Cleanup:** Delete test company after verification.

---

### Test 2: Two Contacts Same Subsidiary, Sequential
**Scenario:** Contact A arrives and is processed. Then Contact B arrives (same subsidiary: Kansas City Chiefs).
**Expected flow for B:**
1. Smart Compare → `linkedin.com/company/kansas-city-chiefs` found in mapping table
2. `resolved_company_id = {chiefs_id}`
3. `routing_tag = "child:{chiefs_id}"`
4. Skip steps 6-9 (no creation needed)
5. Associate → contact linked to Chiefs
6. Set resolved → true

**Verify:**
- [ ] Contact B associated to Chiefs (same company as Contact A)
- [ ] No new company created
- [ ] No duplicate company in HubSpot
- [ ] Processing time for B is faster than A (skipped creation steps)

---

### Test 3: Two Contacts Same Subsidiary, Parallel (Race Condition)
**Scenario:** Two contacts for a NEW subsidiary arrive simultaneously. Neither is in the mapping table.

**Setup:** Remove the test subsidiary from the mapping table. Add two contacts for it in the same Clay table run.

**Expected flow:**
- Both contacts detect "new_child"
- Both search HubSpot → not found
- Both attempt to create company
- Verify-after-create catches the duplicate:
  - One contact's verify returns count = 2
  - That contact triggers delete on the higher-ID duplicate

**Verify:**
- [ ] Only ONE company exists in HubSpot after both contacts process
- [ ] Both contacts are associated to the SAME company
- [ ] Mapping table has one entry (not two) for this LinkedIn URL

**Note:** This test depends on Clay's parallel processing behavior. If Clay processes rows strictly sequentially, the race condition can't happen — but test anyway to confirm.

---

### Test 4: Contact for Known Child (Already in Mapping Table)
**Scenario:** Contact A arrives. Their LinkedIn URL is already in the mapping table.
**Expected flow:**
1. Smart Compare → immediate match in mapping table (step 2a)
2. `resolved_company_id = {chiefs_id}`
3. Skip all HubSpot search/create steps
4. Associate directly

**Verify:**
- [ ] No HubSpot search API call made
- [ ] No company creation attempted
- [ ] Contact associated to correct child
- [ ] `routing_confidence = "high"`

---

### Test 5: Clay Key Column Dedup Behavior
**Scenario:** Write the same LinkedIn URL to the mapping table twice.
**Purpose:** Understand Clay's native dedup behavior for the key column.

**Steps:**
1. Note current row count in mapping table
2. Manually add a row: `linkedin.com/company/test-dedup-check` with ID `999`
3. Add another row with the same URL: `linkedin.com/company/test-dedup-check` with ID `888`
4. Check: did Clay reject the second write? Update it? Create a duplicate row?

**Result:** [ ] Rejected (error) | [ ] Updated existing row | [ ] Created duplicate row

**Impact on architecture:**
- If **rejected:** We need error handling in the `mapping_table_write` step
- If **updated:** Ideal behavior — our flow works as designed
- If **duplicated:** We need additional dedup logic before writing to the mapping table

**Cleanup:** Delete test rows.

---

### Test 6: HubSpot Indexing Delay Measurement
**Scenario:** Create a company via API, then immediately search for it.
**Purpose:** Measure the actual delay before HubSpot's search API can find newly created records.

**Steps:**
```bash
# 1. Create a test company
CREATED=$(curl -s -X POST "https://api.hubapi.com/crm/v3/objects/companies" \
  -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"name": "DEDUP TEST - DELETE ME", "linkedin_company_url": "linkedin.com/company/dedup-test-timing"}}')

echo "Created: $(echo $CREATED | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')"

# 2. Immediately search
for i in 1 2 3 4 5; do
  FOUND=$(curl -s -X POST "https://api.hubapi.com/crm/v3/objects/companies/search" \
    -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"filterGroups": [{"filters": [{"propertyName": "linkedin_company_url", "operator": "EQ", "value": "linkedin.com/company/dedup-test-timing"}]}], "limit": 1}')
  COUNT=$(echo $FOUND | python3 -c 'import sys,json; print(json.load(sys.stdin)["total"])')
  echo "Search attempt $i ($(date +%H:%M:%S)): found $COUNT"
  sleep 1
done

# 3. Cleanup
COMPANY_ID=$(echo $CREATED | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
curl -s -X DELETE "https://api.hubapi.com/crm/v3/objects/companies/$COMPANY_ID" \
  -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN"
echo "Cleaned up test company"
```

**Result:**
- Delay before searchable: _____ seconds
- Implication for verify-after-create step: _____

---

### Test 7: Weekly Dedup Scan
**Scenario:** Seed a duplicate company, then run the weekly scan to verify detection.

**Steps:**
1. Create two companies with the same LinkedIn URL:
   ```bash
   # Company 1
   curl -s -X POST "https://api.hubapi.com/crm/v3/objects/companies" \
     -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"properties": {"name": "DEDUP SCAN TEST A", "linkedin_company_url": "linkedin.com/company/dedup-scan-test"}}'

   # Company 2 (duplicate)
   curl -s -X POST "https://api.hubapi.com/crm/v3/objects/companies" \
     -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"properties": {"name": "DEDUP SCAN TEST B", "linkedin_company_url": "linkedin.com/company/dedup-scan-test"}}'
   ```
2. Wait 5 seconds for indexing
3. Run: `bash scripts/clay-setup/07-weekly-dedup-scan.sh`
4. Verify the scan flags the duplicate pair

**Verify:**
- [ ] Scan output lists the duplicate LinkedIn URL
- [ ] Both company IDs are shown
- [ ] Recommendation indicates which to keep (lowest ID)

**Cleanup:** Delete both test companies.

---

## Smart Compare Tests

### Test 8: LinkedIn URL = Child Company (Happy Path)
**Contact:** Test contact A — LinkedIn URL is `linkedin.com/company/kansas-city-chiefs`
**Expected:** Step 2a catches it immediately. `routing_tag = "child:{chiefs_id}"`

**Verify:**
- [ ] `primary_url_match = {chiefs_id}`
- [ ] `resolved_company_id = {chiefs_id}`
- [ ] Title/multirole/headline checks NOT executed (first match wins)

---

### Test 9: Title Rescue — LinkedIn URL = Parent, Title Contains Child Name
**Contact:** Test contact C — `"Director of Entertainment Teams - Kansas City Chiefs"` at NFL
**Expected:** Step 2a fails (NFL is parent). Step 2b catches "Kansas City Chiefs" in title.

**Verify:**
- [ ] `primary_url_match` is empty (NFL URL not in mapping as child)
- [ ] `title_company_extract = {chiefs_id}` (substring match on "Kansas City Chiefs")
- [ ] `resolved_company_id = {chiefs_id}`
- [ ] `routing_tag = "child:{chiefs_id}"`
- [ ] Contact associated to Chiefs, NOT NFL

---

### Test 10: Multi-Role — Secondary Role at Child Company
**Contact:** Create a test contact with:
- Primary role: NFL (`linkedin.com/company/nfl`)
- Secondary role: Kansas City Chiefs (`linkedin.com/company/kansas-city-chiefs`)
- Job title: "VP Strategy" (no child name in title)

**Expected:** Steps 2a and 2b fail. Step 2c catches the secondary role's company URL.

**Verify:**
- [ ] `primary_url_match` is empty
- [ ] `title_company_extract` is empty
- [ ] `multirole_match = {chiefs_id}`
- [ ] `resolved_company_id = {chiefs_id}`
- [ ] Contact associated to Chiefs

---

### Test 11: Headline Match — "at {Company}" Pattern
**Contact:** Create a test contact with:
- LinkedIn URL: `linkedin.com/company/nfl` (parent)
- Job title: "VP Operations" (no child name)
- Single role (no secondary)
- Headline: "Entertainment Director at Kansas City Chiefs | NFL"

**Expected:** Steps 2a, 2b, 2c fail. Step 2d extracts "Kansas City Chiefs" from headline.

**Verify:**
- [ ] `primary_url_match` is empty
- [ ] `title_company_extract` is empty
- [ ] `multirole_match` is empty
- [ ] `headline_company_extract = {chiefs_id}`
- [ ] `resolved_company_id = {chiefs_id}`
- [ ] Contact associated to Chiefs

---

### Test 12: All Signals Point to Parent (No False Rescue)
**Contact:** Test contact D — everything points to NFL (parent)
- LinkedIn URL: `linkedin.com/company/nfl`
- Job title: "VP Strategy"
- Headline: "Strategy at NFL"
- Single role at NFL

**Expected:** All Smart Compare steps return empty (NFL is the parent, not a child). Contact tagged "parent".

**Verify:**
- [ ] `resolved_company_id` is empty
- [ ] `mismatch_detected = false` (email @nfl.com matches LinkedIn NFL)
- [ ] `routing_tag = "parent"`
- [ ] Contact associated to NFL parent company
- [ ] `routing_confidence = "high"`
- [ ] No false child rescue triggered

---

### Test 13: Parent Domain, No Mismatch → Tag "Parent"
**Contact:** Someone who legitimately works for the parent organization.
- Email: @nfl.com
- LinkedIn: NFL
- Title: "Commissioner's Office Analyst"

**Expected:** No mismatch, no child signal → `routing_tag = "parent"`, associate to NFL.

**Verify:**
- [ ] `mismatch_detected = false`
- [ ] `routing_tag = "parent"`
- [ ] `company_association_resolved = true`
- [ ] Associated to parent company

---

### Test 14: No LinkedIn Data → Manual Review Queue
**Contact:** Test contact E — no LinkedIn profile found

**Expected:** No LinkedIn URL → `routing_confidence = "low"` → `routing_tag = "review"`

**Verify:**
- [ ] `linkedin_company_url` is empty
- [ ] `routing_confidence = "low"`
- [ ] `routing_tag = "review"`
- [ ] No HubSpot API calls made (search/create/associate skipped)
- [ ] Contact flagged for manual review

---

### Test 15: Title Match Strictness — Abbreviations Do NOT Match
**Contact:** Test contact G — title contains "KC Chiefs" (abbreviation)
- LinkedIn URL: `linkedin.com/company/nfl` (parent)
- Job title: "KC Chiefs liaison"

**Expected:** "KC Chiefs" does NOT match "Kansas City Chiefs" in mapping table (exact substring only).

**Verify:**
- [ ] `title_company_extract` is empty (no match — "KC Chiefs" ≠ "Kansas City Chiefs")
- [ ] Contact is NOT routed to Chiefs
- [ ] If mismatch detected → routed as "new_child" or "review" depending on confidence
- [ ] This is CORRECT behavior for v1 — safer to miss than to false-match

**Future consideration:** If too many contacts are missed by strict matching, add a fuzzy match layer in v2. But start strict.

---

## Test Summary Template

After running all tests, fill in:

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 1 | Single contact, new child | | |
| 2 | Sequential, same subsidiary | | |
| 3 | Parallel race condition | | |
| 4 | Known child (mapping table) | | |
| 5 | Clay key dedup behavior | | |
| 6 | HubSpot indexing delay | | |
| 7 | Weekly dedup scan | | |
| 8 | URL match (happy path) | | |
| 9 | Title rescue | | |
| 10 | Multi-role match | | |
| 11 | Headline match | | |
| 12 | All signals = parent | | |
| 13 | Parent, no mismatch | | |
| 14 | No LinkedIn data | | |
| 15 | Title strictness | | |

**Overall pass rate:** ___/15
**Blocking issues found:** _____
**Ready for pilot?** [ ] Yes | [ ] No — issues to fix first

---

## Real-World Edge Case Fixtures

**Source:** `scripts/clay-setup/edge-case-fixtures.json` (29 companies, 58 scenarios)

Generated from Exa search results + domain knowledge to stress-test Smart Compare signals against real corporate structures. Each category targets a specific routing weakness.

### Category → Existing Test Coverage Map

| Category | Companies | Scenarios | Primary Signal Tested | Maps to Tests |
|---|---|---|---|---|
| Shared Domain Conglomerates | NFL, Alphabet, Disney, Comcast, Amazon | 16 | Domain mismatch detection | 1, 2, 4, 8 |
| LinkedIn Profile Mismatches | WPP, Publicis, Dentsu, Accenture, IPG | 12 | Title Rescue + Multi-Role (LinkedIn shows parent) | 9, 10, 11 |
| Similar-Name Subsidiaries | JPMorgan, EY, PwC, Meta, Berkshire | 12 | Title Rescue strictness (abbreviation/alias edge cases) | 15 |
| Multi-Division Single Domain | Amazon, Microsoft, Salesforce, Cisco, Verizon | 9 | Multi-Role detection across divisions | 10, 11 |
| International Subsidiaries | Salesforce, Oracle, SAP, IBM, Deloitte | 11 | Region-based routing (AMER/EMEA/APAC) | 12, 13 |
| Recently Acquired Companies | Broadcom/VMware, Cisco/Splunk, HPE/Juniper, Capital One/Discover, Alphabet/Wiz | 8 | Mapping table staleness | 1, 6 |

### Risk Scenarios (14 total)

These scenarios have a `risk` field identifying specific failure modes:

| Risk | Category | Company | Description |
|---|---|---|---|
| Substring false-match | similar_name | JPMorgan | "Chase" in title matches child AND parent name |
| Short abbreviation | similar_name | EY | "EY" appears in parent AND subsidiary names |
| Special characters | similar_name | PwC | "Strategy&" — ampersand may break matching |
| Old vs new name | similar_name | PwC | "PricewaterhouseCoopers" ≠ "PwC" in mapping table |
| Product vs company | similar_name | Meta | "Facebook" — is it a subsidiary or product team? |
| Independent domain | similar_name | Berkshire | GEICO uses @geico.com — NOT a domain mismatch |
| Domain transition | acquired | Broadcom/VMware | vmware.com → broadcom.com in progress |
| Domain transition | acquired | Cisco/Splunk | splunk.com not yet in parent domain list |
| Brand not integrated | acquired | HPE/Juniper | juniper.net not in any parent's domain list |
| CRM merge | acquired | Capital One/Discover | Two CRM databases merging |
| Pre-acquisition orphan | acquired | Alphabet/Wiz | wiz.io not yet linked to any parent |
| Post-acquisition mapping | acquired | Alphabet/Wiz | Need mapping table update for wiz-inc LinkedIn |
| Red Hat domain gap | international | IBM | redhat.com as IBM subsidiary domain must be recognized |
| Regional routing | international | IBM | "IBM Consulting Japan" → which subsidiary gets it? |

### How to Use These Fixtures

1. **Before pilot:** Walk through each category's scenarios mentally — does our current routing logic handle them?
2. **During pilot:** Use 2-3 companies per category as live test data in the Clay routing table
3. **After pilot:** Cross-reference actual routing results against `expected_signal` in the fixtures
4. **Ongoing:** When a new acquisition happens, add it to the `recently_acquired_companies` category

### Fixture Schema

Each scenario in `edge-case-fixtures.json` contains:
```
contact_email           → simulated contact email
contact_linkedin_company → LinkedIn company URL from enrichment
contact_title           → job title from enrichment
contact_headline        → LinkedIn headline from enrichment
contact_secondary_company → (optional) secondary LinkedIn role
expected_match          → which subsidiary should be matched (null = parent or manual review)
expected_signal         → which Smart Compare signal should fire
expected_region         → (optional) for international subs — AMER/EMEA/APAC
risk                    → (optional) specific failure mode to watch for
```
