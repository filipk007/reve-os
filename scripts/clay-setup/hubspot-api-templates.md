# HubSpot API Request Templates for Clay

**Phase 2: All-in-Clay Routing**
**Purpose:** Ready-to-paste HTTP Request configurations for Clay columns. Each template includes URL, method, headers, body, and response parsing.

**Base URL:** `https://api.hubapi.com`
**Auth Header:** `Authorization: Bearer {{HUBSPOT_ACCESS_TOKEN}}`

---

## 1. Search Company by LinkedIn URL

**Flow Step:** 6 (HubSpot search) and 9 (verify-after-create)
**When:** `routing_tag = "new_child"` — check if company already exists in HubSpot

### Clay HTTP Request Config

| Field | Value |
|-------|-------|
| **Method** | POST |
| **URL** | `https://api.hubapi.com/crm/v3/objects/companies/search` |
| **Headers** | `Authorization: Bearer {{HUBSPOT_ACCESS_TOKEN}}` |
| | `Content-Type: application/json` |

### Body
```json
{
  "filterGroups": [
    {
      "filters": [
        {
          "propertyName": "linkedin_company_url",
          "operator": "EQ",
          "value": "{{linkedin_company_url}}"
        }
      ]
    }
  ],
  "properties": ["name", "domain", "linkedin_company_url", "hs_object_id"],
  "limit": 10
}
```

### Response Parsing
- **Company found:** `results[0].id` — the HubSpot company ID
- **Result count:** `total` — number of matches (use for dedup: if > 1, duplicates exist)
- **Not found:** `total = 0`

### Test with curl
```bash
curl -s -X POST "https://api.hubapi.com/crm/v3/objects/companies/search" \
  -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filterGroups": [{
      "filters": [{
        "propertyName": "linkedin_company_url",
        "operator": "EQ",
        "value": "linkedin.com/company/kansas-city-chiefs"
      }]
    }],
    "properties": ["name", "domain", "linkedin_company_url"],
    "limit": 10
  }' | python3 -m json.tool
```

---

## 2. Create Child Company

**Flow Step:** 8 (create new child company in HubSpot)
**When:** `routing_tag = "new_child"` AND HubSpot search returned 0 results

### Clay HTTP Request Config

| Field | Value |
|-------|-------|
| **Method** | POST |
| **URL** | `https://api.hubapi.com/crm/v3/objects/companies` |
| **Headers** | `Authorization: Bearer {{HUBSPOT_ACCESS_TOKEN}}` |
| | `Content-Type: application/json` |

### Body
```json
{
  "properties": {
    "name": "{{linkedin_company_name}}",
    "linkedin_company_url": "{{linkedin_company_url}}",
    "description": "Auto-created by Clay routing. Child of {{email_domain}} parent."
  }
}
```

**CRITICAL:** Do NOT include `domain` in the creation payload. HubSpot deduplicates on domain — if you set `domain: "nfl.com"` on the Kansas City Chiefs record, HubSpot may merge it with the NFL parent. The child company's identity comes from its LinkedIn URL and name, not from the parent's email domain.

### Response Parsing
- **Success (201):** `id` — the newly created company's HubSpot record ID
- **Conflict (409):** Company with same identifying properties already exists — use the returned ID

### Test with curl
```bash
curl -s -X POST "https://api.hubapi.com/crm/v3/objects/companies" \
  -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "name": "Kansas City Chiefs (TEST - DELETE ME)",
      "linkedin_company_url": "linkedin.com/company/kansas-city-chiefs-test",
      "description": "Auto-created by Clay routing. Child of nfl.com parent."
    }
  }' | python3 -m json.tool
```

**After testing:** Delete the test company — see template 3 below.

---

## 3. Delete Duplicate Company

**Flow Step:** 9 (verify-after-create found duplicates)
**When:** `duplicate_count > 1` — keep lowest ID, delete the rest

### Clay HTTP Request Config

| Field | Value |
|-------|-------|
| **Method** | DELETE |
| **URL** | `https://api.hubapi.com/crm/v3/objects/companies/{{duplicate_company_id}}` |
| **Headers** | `Authorization: Bearer {{HUBSPOT_ACCESS_TOKEN}}` |

### Body
None (DELETE request)

### Response Parsing
- **Success (204):** No content — company deleted
- **Not found (404):** Company already deleted (idempotent)

### Logic for Choosing Which to Delete
When verify-after-create returns multiple companies with the same LinkedIn URL:
1. Sort results by `id` (ascending — lowest = created first)
2. Keep `results[0].id` (the first-created company)
3. Delete `results[1..n].id` (all duplicates)

In Clay formula:
```
IF(duplicate_count > 1,
  hubspot_verify_create.results[1].id,
  "")
```

### Test with curl
```bash
# Only run against a test company you created!
curl -s -X DELETE "https://api.hubapi.com/crm/v3/objects/companies/TEST_COMPANY_ID" \
  -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"
```

---

## 4. Associate Contact to Company

**Flow Step:** 10 (link contact to the correct child company)
**When:** `final_company_id` exists

### Clay HTTP Request Config

| Field | Value |
|-------|-------|
| **Method** | PUT |
| **URL** | `https://api.hubapi.com/crm/v4/objects/contacts/{{contact_id}}/associations/companies/{{final_company_id}}` |
| **Headers** | `Authorization: Bearer {{HUBSPOT_ACCESS_TOKEN}}` |
| | `Content-Type: application/json` |

### Body
```json
[
  {
    "associationCategory": "HUBSPOT_DEFINED",
    "associationTypeId": 1
  }
]
```

**Note:** `associationTypeId: 1` = standard Contact-to-Company association. If 12 Labs uses custom association labels, check with Sean for the correct type ID.

### Response Parsing
- **Success (200):** Association created
- **Already exists:** HubSpot is idempotent — re-associating an existing association is a no-op

### Test with curl
```bash
curl -s -X PUT "https://api.hubapi.com/crm/v4/objects/contacts/TEST_CONTACT_ID/associations/companies/TEST_COMPANY_ID" \
  -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 1}]' \
  | python3 -m json.tool
```

---

## 5. Update Contact Properties

**Flow Step:** 11 (set resolved flag) and 12 (assign owner)
**When:** After association is complete

### Clay HTTP Request Config — Set Resolved Flag

| Field | Value |
|-------|-------|
| **Method** | PATCH |
| **URL** | `https://api.hubapi.com/crm/v3/objects/contacts/{{contact_id}}` |
| **Headers** | `Authorization: Bearer {{HUBSPOT_ACCESS_TOKEN}}` |
| | `Content-Type: application/json` |

### Body — Set Resolved + Routing Tag + Confidence
```json
{
  "properties": {
    "company_association_resolved": "true",
    "routing_tag": "{{routing_tag}}",
    "routing_confidence": "{{routing_confidence}}"
  }
}
```

### Body — Assign Owner (separate request, runs after decision tree)
```json
{
  "properties": {
    "hubspot_owner_id": "{{assigned_owner_id}}"
  }
}
```

### Response Parsing
- **Success (200):** Contact updated
- **Not found (404):** Contact ID invalid

### Test with curl
```bash
# Set resolved flag
curl -s -X PATCH "https://api.hubapi.com/crm/v3/objects/contacts/TEST_CONTACT_ID" \
  -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "company_association_resolved": "true",
      "routing_tag": "child:123456789",
      "routing_confidence": "high"
    }
  }' | python3 -m json.tool
```

---

## 6. Remove Wrong Association

**Flow Step:** 10 (remove auto-associated parent before associating to child)
**When:** `mismatch_detected = true` — contact was auto-associated to parent company

### Clay HTTP Request Config

| Field | Value |
|-------|-------|
| **Method** | DELETE |
| **URL** | `https://api.hubapi.com/crm/v4/objects/contacts/{{contact_id}}/associations/companies/{{parent_company_id}}` |
| **Headers** | `Authorization: Bearer {{HUBSPOT_ACCESS_TOKEN}}` |

### Body
None (DELETE request)

### How to Get Parent Company ID
The parent company ID can be determined from the email domain:
1. Look up `email_domain` in the mapping table's `parent_domain` column
2. Search HubSpot: `POST /crm/v3/objects/companies/search` with `domain = email_domain`
3. The parent is the company whose domain matches the email domain

### Response Parsing
- **Success (200):** Association removed
- **Not found (404):** Association didn't exist (safe to ignore)

### Test with curl
```bash
curl -s -X DELETE "https://api.hubapi.com/crm/v4/objects/contacts/TEST_CONTACT_ID/associations/companies/PARENT_COMPANY_ID" \
  -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"
```

---

## Authentication Notes

### HubSpot Access Token in Clay
1. In Clay, go to Settings → Integrations → Custom API Keys
2. Add a key named `HUBSPOT_ACCESS_TOKEN`
3. Paste the Private App token value
4. Reference in HTTP Request columns as `{{HUBSPOT_ACCESS_TOKEN}}`

### Required HubSpot Scopes
The Private App needs these scopes:
- `crm.objects.contacts.read` — read contact properties
- `crm.objects.contacts.write` — update contact properties + owner
- `crm.objects.companies.read` — search companies
- `crm.objects.companies.write` — create/delete companies
- `crm.schemas.contacts.read` — read property definitions
- `crm.objects.contacts.write` — manage associations (v4 API)

### Rate Limits
HubSpot Private Apps: **100 requests per 10 seconds**. With 50-500 contacts/day processing, this is well within limits. Clay's built-in rate limiting handles this automatically for HTTP Request columns.

---

## Variable Reference

These are the Clay column values referenced in the templates above:

| Variable | Source | Description |
|----------|--------|-------------|
| `{{HUBSPOT_ACCESS_TOKEN}}` | Clay integration settings | HubSpot Private App token |
| `{{linkedin_company_url}}` | Enrichment column | Normalized LinkedIn company URL |
| `{{linkedin_company_name}}` | Enrichment column | Company name from LinkedIn |
| `{{email_domain}}` | Formula column | Domain extracted from email |
| `{{contact_id}}` | HubSpot contact ID | The contact being routed |
| `{{final_company_id}}` | Formula column | Resolved company ID (from any source) |
| `{{parent_company_id}}` | Lookup/search | Parent company to de-associate from |
| `{{routing_tag}}` | Formula column | parent / child:{id} / new_child / review |
| `{{routing_confidence}}` | Formula column | high / medium / low |
| `{{assigned_owner_id}}` | Decision tree formula | HubSpot owner ID from routing logic |
| `{{duplicate_company_id}}` | Verify step formula | Company ID to delete (duplicate) |
