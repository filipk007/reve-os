# Clay Contact Routing Table — Column Specification

**Phase 2: All-in-Clay (Detection → Association → Routing)**
**Purpose:** Every column in the Clay contact routing table, mapped to the 12-step flow.

---

## Column Index

| # | Column Name | Type | Flow Step | Runs When |
|---|------------|------|-----------|-----------|
| 1 | `email` | Input | — | Always (row input) |
| 2 | `email_domain` | Formula | 1 | Always |
| 3 | `linkedin_company_url` | Enrichment | 1 | Always |
| 4 | `linkedin_company_name` | Enrichment | 1 | Always |
| 5 | `job_title` | Enrichment | 1 | Always |
| 6 | `headline` | Enrichment | 1 | Always |
| 7 | `all_current_roles` | Enrichment | 1 | Always |
| 8 | `primary_url_match` | Lookup | 2a | Always |
| 9 | `title_company_extract` | Formula | 2b | primary_url_match is empty |
| 10 | `multirole_match` | Formula/Lookup | 2c | primary_url_match + title empty |
| 11 | `headline_company_extract` | Formula | 2d | all prior matches empty |
| 12 | `resolved_company_id` | Formula | 2 | Always (COALESCE) |
| 13 | `routing_tag` | Formula | 2-3 | Always |
| 14 | `routing_confidence` | Formula | 4 | Always |
| 15 | `mismatch_detected` | Formula | 3 | routing_tag ≠ child:* |
| 16 | `hubspot_search_result` | HTTP Request | 6 | routing_tag = "new_child" |
| 17 | `hubspot_search_company_id` | Formula | 6 | hubspot_search_result exists |
| 18 | `mapping_table_write` | Lookup (write) | 7 | new child, not found in search |
| 19 | `hubspot_create_company` | HTTP Request | 8 | new child, not in HubSpot |
| 20 | `created_company_id` | Formula | 8 | hubspot_create_company succeeded |
| 21 | `hubspot_verify_create` | HTTP Request | 9 | created_company_id exists |
| 22 | `duplicate_count` | Formula | 9 | hubspot_verify_create ran |
| 23 | `hubspot_delete_duplicate` | HTTP Request | 9 | duplicate_count > 1 |
| 24 | `final_company_id` | Formula | 10 | Always (COALESCE across all sources) |
| 25 | `hubspot_associate` | HTTP Request | 10 | final_company_id exists |
| 26 | `hubspot_remove_wrong_assoc` | HTTP Request | 10 | mismatch_detected = true |
| 27 | `hubspot_set_resolved` | HTTP Request | 11 | hubspot_associate succeeded |
| 28 | `region` | Enrichment/Formula | 12 | resolved = true |
| 29 | `company_type` | HTTP Request/Lookup | 12 | resolved = true |
| 30 | `industry` | Enrichment | 12 | resolved = true |
| 31 | `segment` | Lookup | 12 | resolved = true |
| 32 | `assigned_owner_id` | Formula | 12 | resolved = true |
| 33 | `hubspot_assign_owner` | HTTP Request | 12 | assigned_owner_id exists |

---

## Column Details

### Step 1: Enrichment

#### `email` (Input)
- **Type:** Text (row input)
- **Source:** Clay table input — the contact's email address
- **Example:** `john.doe@nfl.com`

#### `email_domain` (Formula)
- **Type:** Formula
- **Logic:** Extract domain from email
- **Formula:** `SPLIT(email, "@")[1]`
- **Example:** `nfl.com`

#### `linkedin_company_url` (Enrichment)
- **Type:** Clay enrichment (LinkedIn Company URL)
- **Source:** Clay's "Enrich Person" → Company LinkedIn URL field
- **Normalization:** Must match format `linkedin.com/company/{slug}` (lowercase, no protocol, no trailing slash, no sub-paths). Use the normalization rules from `scripts/hubspot-setup/05-normalize-linkedin-url.py`.
- **Example:** `linkedin.com/company/nfl`

#### `linkedin_company_name` (Enrichment)
- **Type:** Clay enrichment (Company Name from LinkedIn)
- **Source:** Clay's "Enrich Person" → Company Name field
- **Example:** `National Football League`

#### `job_title` (Enrichment)
- **Type:** Clay enrichment
- **Source:** Clay's "Enrich Person" → Job Title field
- **Example:** `Director of Entertainment Teams - Kansas City Chiefs`

#### `headline` (Enrichment)
- **Type:** Clay enrichment
- **Source:** Clay's "Enrich Person" → LinkedIn Headline field
- **Example:** `Entertainment Director at Kansas City Chiefs | NFL`

#### `all_current_roles` (Enrichment)
- **Type:** Clay enrichment (array/JSON)
- **Source:** Clay's "Enrich Person" → All Current Positions
- **Fields per role:** `company_name`, `company_url`, `title`
- **Example:**
```json
[
  {"company_name": "National Football League", "company_url": "linkedin.com/company/nfl", "title": "Director of Entertainment Teams"},
  {"company_name": "Kansas City Chiefs", "company_url": "linkedin.com/company/kansas-city-chiefs", "title": "Entertainment Director"}
]
```

---

### Step 2: Smart Compare (Multi-Signal Detection)

Priority order: URL → Title → Multi-role → Headline. **First match wins.**

#### `primary_url_match` (Lookup)
- **Type:** Lookup against mapping table
- **Lookup key:** `linkedin_company_url` → mapping table `linkedin_company_url` column
- **Returns:** `hubspot_company_id` from mapping table, or empty
- **Example:** `linkedin.com/company/kansas-city-chiefs` → `123456789`

#### `title_company_extract` (Formula)
- **Type:** Formula
- **Runs when:** `primary_url_match` is empty
- **Logic:** Check if `job_title` contains any `company_name` value from the mapping table as an exact substring (case-insensitive)
- **Implementation in Clay:**
  1. Load all `company_name` values from mapping table into a reference list
  2. For each company name, check if `CONTAINS(LOWER(job_title), LOWER(company_name))`
  3. Return the matching `hubspot_company_id`, or empty
- **IMPORTANT:** Exact substring match ONLY. No fuzzy matching, no abbreviation expansion. "Kansas City Chiefs" matches, but "KC Chiefs" does NOT. This is the safest v1 approach — iterate later if needed.
- **Example:** `"Director of Entertainment Teams - Kansas City Chiefs"` contains `"Kansas City Chiefs"` → match → returns `123456789`

#### `multirole_match` (Formula/Lookup)
- **Type:** Formula + Lookup
- **Runs when:** `primary_url_match` + `title_company_extract` are both empty
- **Logic:** For each entry in `all_current_roles`, check if `company_url` exists in the mapping table
- **Implementation:** Iterate `all_current_roles[].company_url`, lookup each against mapping table
- **Returns:** First matching `hubspot_company_id`, or empty
- **Example:** Second role has `company_url: "linkedin.com/company/kansas-city-chiefs"` → found in mapping table → returns `123456789`

#### `headline_company_extract` (Formula)
- **Type:** Formula
- **Runs when:** All prior matches are empty
- **Logic:** Extract company name after "at " in the headline text, then match against mapping table company names (exact substring, case-insensitive)
- **Regex pattern:** `at\s+([A-Za-z0-9\s&'-]+)` — captures text after "at " up to a delimiter
- **Example:** `"Entertainment Director at Kansas City Chiefs | NFL"` → extracts `"Kansas City Chiefs"` → matches mapping table → returns `123456789`

#### `resolved_company_id` (Formula)
- **Type:** Formula (COALESCE)
- **Logic:** First non-empty value from: `primary_url_match` → `title_company_extract` → `multirole_match` → `headline_company_extract`
- **Formula:** `COALESCE(primary_url_match, title_company_extract, multirole_match, headline_company_extract)`
- **Example:** `123456789` (from whichever signal matched first)

#### `routing_tag` (Formula)
- **Type:** Formula
- **Logic:**
  - `resolved_company_id` exists → `"child:{resolved_company_id}"`
  - `mismatch_detected` = true AND no match → `"new_child"`
  - `mismatch_detected` = false → `"parent"`
  - Low confidence → `"review"`
- **Formula:**
```
IF(routing_confidence = "low", "review",
  IF(resolved_company_id != "", "child:" & resolved_company_id,
    IF(mismatch_detected = true, "new_child",
      "parent")))
```

#### `routing_confidence` (Formula)
- **Type:** Formula
- **Logic:**
  - `linkedin_company_url` is empty → `"low"`
  - `linkedin_company_url` exists AND `resolved_company_id` exists → `"high"`
  - `linkedin_company_url` exists AND mismatch but no match → `"medium"`
  - Ambiguous signals → `"low"`
- **Formula:**
```
IF(linkedin_company_url = "", "low",
  IF(resolved_company_id != "", "high",
    IF(mismatch_detected = true, "medium",
      "high")))
```

---

### Step 3: Mismatch Check

#### `mismatch_detected` (Formula)
- **Type:** Formula (boolean)
- **Logic:** Does the email domain company differ from the LinkedIn company?
- **Implementation:** Compare `email_domain` against `linkedin_company_name` and parent domains in mapping table
- **Formula:** `email_domain is in mapping_table.parent_domain AND linkedin_company_url is NOT in mapping_table (as a parent entry)`
- **Simpler approach:** If `email_domain` appears in the mapping table's `parent_domain` column, then this contact is from a parent domain → check if LinkedIn URL matches a child. If LinkedIn URL is not a known child AND not the parent's own URL → mismatch.
- **Example:** email `@nfl.com` + LinkedIn = `linkedin.com/company/kansas-city-chiefs` → mismatch (different company)

---

### Step 6: HubSpot Search (New Child Candidates)

#### `hubspot_search_result` (HTTP Request)
- **Type:** HTTP Request
- **Runs when:** `routing_tag = "new_child"` (mismatch detected, not in mapping table)
- **See:** `hubspot-api-templates.md` → Search Company template
- **Response parsing:** Extract `results[0].id` as company ID, `total` as result count
- **Example response field:** `hubspot_search_company_id = "987654321"` or empty

#### `hubspot_search_company_id` (Formula)
- **Type:** Formula
- **Logic:** Parse `hubspot_search_result` response → extract company ID if found
- **Formula:** `IF(hubspot_search_result.total > 0, hubspot_search_result.results[0].id, "")`

---

### Step 7: Mapping Table Write

#### `mapping_table_write` (Lookup — Write)
- **Type:** Clay table write / add row
- **Runs when:** `routing_tag = "new_child"` AND `hubspot_search_company_id` is empty (truly new)
- **Writes to:** LinkedIn URL → Company ID mapping table
- **Row data:**
  - `linkedin_company_url`: contact's normalized LinkedIn company URL
  - `hubspot_company_id`: will be populated after Step 8 (create)
  - `company_name`: `linkedin_company_name`
  - `parent_company_name`: looked up from email domain
  - `parent_domain`: `email_domain`

---

### Step 8: Create Company in HubSpot

#### `hubspot_create_company` (HTTP Request)
- **Type:** HTTP Request
- **Runs when:** `routing_tag = "new_child"` AND `hubspot_search_company_id` is empty
- **See:** `hubspot-api-templates.md` → Create Child Company template
- **CRITICAL:** Use Record ID as the unique key, NOT domain. Domain-based dedup in HubSpot would merge subsidiaries sharing a parent domain.

#### `created_company_id` (Formula)
- **Type:** Formula
- **Logic:** Parse create response → extract the new company's `id` field
- **Formula:** `hubspot_create_company.id`

---

### Step 9: Verify After Create (Race Condition Guard)

#### `hubspot_verify_create` (HTTP Request)
- **Type:** HTTP Request
- **Runs when:** `created_company_id` is not empty
- **See:** `hubspot-api-templates.md` → Search Company template (same as step 6)
- **Purpose:** Search for companies with this LinkedIn URL. If count > 1, a race condition created a duplicate.
- **Note:** HubSpot has ~1-2 second indexing delay. This check catches most races but not all. The weekly dedup scan is the final safety net.

#### `duplicate_count` (Formula)
- **Type:** Formula
- **Logic:** `hubspot_verify_create.total`
- **Example:** `1` (clean) or `2` (duplicate detected)

#### `hubspot_delete_duplicate` (HTTP Request)
- **Type:** HTTP Request
- **Runs when:** `duplicate_count > 1`
- **See:** `hubspot-api-templates.md` → Delete Duplicate template
- **Logic:** Keep the company with the lowest ID (created first), delete the other(s)

---

### Step 10: Associate Contact to Company

#### `final_company_id` (Formula)
- **Type:** Formula (COALESCE)
- **Logic:** The definitive company ID from whichever source resolved it
- **Formula:** `COALESCE(resolved_company_id, hubspot_search_company_id, created_company_id)`

#### `hubspot_associate` (HTTP Request)
- **Type:** HTTP Request
- **Runs when:** `final_company_id` is not empty
- **See:** `hubspot-api-templates.md` → Associate Contact↔Company template

#### `hubspot_remove_wrong_assoc` (HTTP Request)
- **Type:** HTTP Request
- **Runs when:** `mismatch_detected = true` (need to remove parent association)
- **See:** `hubspot-api-templates.md` → Remove Wrong Association template
- **Note:** Only remove the auto-associated parent company. Look up parent company ID from email domain first.

---

### Step 11: Set Resolved Flag

#### `hubspot_set_resolved` (HTTP Request)
- **Type:** HTTP Request
- **Runs when:** `hubspot_associate` succeeded
- **See:** `hubspot-api-templates.md` → Update Contact Properties template
- **Sets:** `company_association_resolved = true`, `routing_confidence = {routing_confidence}`, `routing_tag = {routing_tag}`

---

### Step 12: Decision Tree (Owner Assignment)

All decision tree columns are **gated on `company_association_resolved = true`**.

#### `region` (Enrichment/Formula)
- **Type:** Enrichment or formula based on company/contact location
- **Logic:** Determine if contact/company is in APAC region
- **Source:** Clay location enrichment or HubSpot company `country` property

#### `company_type` (HTTP Request/Lookup)
- **Type:** Lookup from HubSpot company properties
- **Source:** HubSpot company `type` property (e.g., "Partner", "Sales Prospect")
- **Note:** Manually set by 12 Labs team. New companies default to "Sales Prospect".

#### `industry` (Enrichment)
- **Type:** Clay enrichment
- **Source:** Company industry from LinkedIn or domain enrichment

#### `segment` (Lookup)
- **Type:** Lookup against Industry → Segment mapping table
- **Source:** Sean's mapping table (Phase 1, Wave 5)
- **Fallback:** If industry not in mapping → route to default/catch-all owner

#### `assigned_owner_id` (Formula)
- **Type:** Formula (decision tree)
- **Logic:**
```
IF(region = "APAC", APAC_OWNER_ID,
  IF(company_type = "Partner", PARTNERSHIP_TEAM_ID,
    SEGMENT_OWNER_LOOKUP(segment)))
```
- **Priority:** Region (APAC) → Type (Partner) → Segment → Default

#### `hubspot_assign_owner` (HTTP Request)
- **Type:** HTTP Request
- **Runs when:** `assigned_owner_id` is not empty
- **See:** `hubspot-api-templates.md` → Update Contact Properties template
- **Sets:** `hubspot_owner_id = {assigned_owner_id}`

---

## Error Handling

| Column | Error Scenario | Handling |
|--------|---------------|----------|
| `linkedin_company_url` | Enrichment returns empty | `routing_confidence = "low"` → `routing_tag = "review"` |
| `hubspot_search_result` | API timeout / 5xx | Retry once. If still fails → `routing_tag = "review"` |
| `hubspot_create_company` | 409 conflict | Company was created by another row — treat as found, use returned ID |
| `hubspot_associate` | 404 contact/company not found | Log error, set `routing_tag = "review"` |
| `hubspot_verify_create` | Returns 0 results | HubSpot indexing delay — company exists but not yet indexed. Acceptable gap — weekly dedup scan catches this |
| Decision tree | No segment mapping for industry | Use default/catch-all owner ID |

---

## Normalization Requirements

All LinkedIn URLs in this table MUST be normalized before comparison:
- Lowercase
- Strip protocol (http/https)
- Strip www
- Strip trailing slash
- Strip sub-paths (/about, /jobs, etc.)
- Final format: `linkedin.com/company/{slug}`

Use the normalization function from `scripts/hubspot-setup/05-normalize-linkedin-url.py`.
Clay formula equivalent: `LOWER(REPLACE(REPLACE(REPLACE(url, "https://", ""), "http://", ""), "www.", ""))` + strip trailing segments.
