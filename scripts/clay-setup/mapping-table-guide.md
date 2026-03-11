# Clay Mapping Table Setup Guide

**Phase 2: All-in-Clay Routing**
**Purpose:** Create and configure the LinkedIn URL → Company ID mapping table in Clay. This table is the first dedup layer and enables Smart Compare title/multi-role matching.

---

## Table Overview

The mapping table serves two purposes:
1. **Dedup lookup** — before creating a company in HubSpot, check if we already know about it
2. **Smart Compare source** — the `company_name` column is used for title rescue and headline matching

---

## Step 1: Create the Table in Clay

1. Open your Clay workspace
2. Click **"+ New Table"** (or equivalent)
3. Name: **`child-company-mapping`** (or "LinkedIn URL → Company ID Mapping")
4. Add the following columns:

| Column Name | Type | Purpose | Required? |
|-------------|------|---------|-----------|
| `linkedin_company_url` | Text | **Primary key / match column** | Yes |
| `hubspot_company_id` | Text | HubSpot record ID for the child company | Yes |
| `company_name` | Text | Human-readable name (used for title matching) | Yes |
| `parent_company_name` | Text | Which parent this child belongs to | Yes |
| `parent_domain` | Text | Parent's email domain (e.g., `nfl.com`) | Yes |

---

## Step 2: Configure the Key Column

The `linkedin_company_url` column must be set as the **lookup key** (dedup key).

**In Clay:**
1. Click on the `linkedin_company_url` column header
2. Set it as the table's primary/key column
3. This ensures Clay deduplicates on this column when writing new rows

**Key behavior to test early:**
- What happens when a row with the same `linkedin_company_url` is written twice?
- Does Clay reject the duplicate? Update it? Create a second row?
- This determines whether we need additional dedup logic in the routing table

See `dedup-test-plan.md` → Test 5 for the specific test procedure.

---

## Step 3: Import Existing Data

### Source CSV
Phase 1 created a CSV template at:
```
scripts/hubspot-setup/clay-mapping-table-template.csv
```

If you ran `04-extract-child-companies.sh`, the populated data is at:
```
scripts/hubspot-setup/output/child-companies.csv
```

### Pre-Import Checklist

Before importing, ensure:

- [ ] **LinkedIn URLs are normalized.** Run through the normalizer:
  ```bash
  python3 scripts/hubspot-setup/05-normalize-linkedin-url.py \
    --input scripts/hubspot-setup/output/child-companies.csv \
    --column linkedin_company_url
  ```
  This creates a `-normalized.csv` file with consistent URL formats.

- [ ] **No duplicate LinkedIn URLs.** Check:
  ```bash
  cut -d',' -f1 child-companies-normalized.csv | sort | uniq -d
  ```
  If duplicates exist, resolve manually before import.

- [ ] **All HubSpot company IDs are valid.** Spot-check 3-5 IDs:
  ```bash
  curl -s "https://api.hubapi.com/crm/v3/objects/companies/COMPANY_ID" \
    -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('properties',{}).get('name','NOT FOUND'))"
  ```

- [ ] **Company names are clean.** These are used for title matching — check for:
  - Extra whitespace
  - Encoding issues (special characters)
  - Abbreviations that differ from LinkedIn (e.g., "KC Chiefs" vs "Kansas City Chiefs")
  - Names should match what appears in LinkedIn profiles and job titles

### Import Steps

1. Open the `child-company-mapping` table in Clay
2. Click **Import** → **CSV Upload**
3. Select the normalized CSV file
4. Map columns:
   - `linkedin_company_url` → `linkedin_company_url`
   - `hubspot_company_id` → `hubspot_company_id`
   - `company_name` → `company_name`
   - `parent_company_name` → `parent_company_name`
   - `parent_domain` → `parent_domain`
5. Import

---

## Step 4: Verify Import

### Spot-Check (5 random entries)

Pick 5 rows and verify against HubSpot:

```bash
# For each company ID, verify name matches
curl -s "https://api.hubapi.com/crm/v3/objects/companies/COMPANY_ID?properties=name,linkedin_company_url" \
  -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
p=d.get('properties',{})
print(f'Name: {p.get(\"name\")}')
print(f'LinkedIn: {p.get(\"linkedin_company_url\")}')
print(f'ID: {d.get(\"id\")}')
"
```

### Record Results

| # | LinkedIn URL | Expected Name | HubSpot Name | Match? |
|---|-------------|--------------|--------------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

---

## Step 5: Configure Lookup in Routing Table

In the contact routing table (the main Clay table that processes contacts):

1. Add a **Lookup** column named `primary_url_match`
2. Configure it to:
   - **Source table:** `child-company-mapping`
   - **Match column:** `linkedin_company_url` (in mapping table)
   - **Lookup value:** `linkedin_company_url` (from contact enrichment, normalized)
   - **Return column:** `hubspot_company_id`

3. Add a **Lookup** column named `title_company_extract`
   - This is more complex — it needs to check if the contact's `job_title` contains any `company_name` from the mapping table
   - Implementation depends on Clay's formula capabilities
   - May require a formula column + lookup combination

---

## Ongoing Maintenance

### Adding New Children
When Clay creates a new child company via the routing table:
- Step 7 (`mapping_table_write`) automatically adds a row to this table
- The row includes: LinkedIn URL, HubSpot company ID, company name, parent info

### Manual Additions
For children discovered outside the automated flow:
1. Get the child company's LinkedIn URL and HubSpot ID
2. Normalize the LinkedIn URL (use the normalizer script)
3. Add a row to the mapping table manually in Clay

### Periodic Validation
Monthly, spot-check 10 random entries:
- Verify company IDs still exist in HubSpot (companies can be merged/deleted)
- Verify LinkedIn URLs are still valid (companies can rebrand/change slugs)
- Remove any rows where the HubSpot company was merged into another

---

## CSV Template

For reference, the mapping table CSV format:

```csv
linkedin_company_url,hubspot_company_id,company_name,parent_company_name,parent_domain
linkedin.com/company/kansas-city-chiefs,123456789,Kansas City Chiefs,NFL,nfl.com
linkedin.com/company/new-england-patriots,234567890,New England Patriots,NFL,nfl.com
linkedin.com/company/amazon-web-services,345678901,Amazon Web Services,Amazon,amazon.com
```

**Note:** LinkedIn URLs in the mapping table use the normalized format (`linkedin.com/company/{slug}`) — no protocol, no www, no trailing slash.
