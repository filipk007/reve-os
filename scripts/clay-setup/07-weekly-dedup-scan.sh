#!/usr/bin/env bash
# =============================================================================
# 07-weekly-dedup-scan.sh
# Phase 2 — Weekly Duplicate Company Detection Scan
#
# Searches HubSpot for all companies with linkedin_company_url set,
# groups by URL, and flags any URL with count > 1 (duplicate companies).
#
# This is the 4th dedup layer — catches any duplicates that slipped through:
#   1. Clay mapping table lookup
#   2. HubSpot Search API (pre-create)
#   3. Verify-after-create (post-create)
#   4. THIS SCRIPT (weekly scan)
#
# Usage:
#   export HUBSPOT_ACCESS_TOKEN="pat-na1-xxxxxxxxxxxx"
#   bash scripts/clay-setup/07-weekly-dedup-scan.sh
#
# Output: scripts/clay-setup/output/dedup-scan-{date}.json
#         Prints summary to stdout
# =============================================================================

set -euo pipefail

if [[ -z "${HUBSPOT_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: HUBSPOT_ACCESS_TOKEN is not set."
  echo "       export HUBSPOT_ACCESS_TOKEN=\"pat-na1-xxxxxxxxxxxx\""
  exit 1
fi

TOKEN="$HUBSPOT_ACCESS_TOKEN"
BASE="https://api.hubapi.com"
TODAY=$(date +%Y-%m-%d)
OUTPUT_DIR="$(dirname "$0")/output"
OUTPUT_FILE="${OUTPUT_DIR}/dedup-scan-${TODAY}.json"

mkdir -p "$OUTPUT_DIR"

echo ""
echo "============================================================"
echo "  Weekly Dedup Scan — ${TODAY}"
echo "  Searching for duplicate companies by LinkedIn URL"
echo "============================================================"
echo ""

# ----------------------------------------------------------------
# Step 1: Fetch all companies with linkedin_company_url set
# Paginate through results (100 per page, HubSpot max)
# ----------------------------------------------------------------
echo "Fetching companies with LinkedIn URLs..."

ALL_COMPANIES="[]"
AFTER=""
PAGE=0

while true; do
  PAGE=$((PAGE + 1))

  # Build search body with optional pagination
  if [[ -z "$AFTER" ]]; then
    BODY='{
      "filterGroups": [{
        "filters": [{
          "propertyName": "linkedin_company_url",
          "operator": "HAS_PROPERTY"
        }]
      }],
      "properties": ["name", "domain", "linkedin_company_url", "hs_object_id"],
      "limit": 100
    }'
  else
    BODY=$(python3 -c "
import json
body = {
    'filterGroups': [{'filters': [{'propertyName': 'linkedin_company_url', 'operator': 'HAS_PROPERTY'}]}],
    'properties': ['name', 'domain', 'linkedin_company_url', 'hs_object_id'],
    'limit': 100,
    'after': '${AFTER}'
}
print(json.dumps(body))
")
  fi

  RESPONSE=$(curl -s -X POST "${BASE}/crm/v3/objects/companies/search" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$BODY")

  # Check for errors
  ERROR=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null || echo "")
  if [[ -n "$ERROR" && "$ERROR" != "" ]]; then
    echo "  [ERROR] HubSpot API error: ${ERROR}"
    exit 1
  fi

  # Extract results and merge
  RESULT_COUNT=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('results',[])))" 2>/dev/null || echo "0")
  echo "  Page ${PAGE}: ${RESULT_COUNT} companies"

  ALL_COMPANIES=$(python3 -c "
import sys, json
existing = json.loads('${ALL_COMPANIES}') if '${ALL_COMPANIES}' != '[]' else []
response = json.loads(sys.stdin.read())
results = response.get('results', [])
existing.extend(results)
print(json.dumps(existing))
" <<< "$RESPONSE")

  # Check for next page
  AFTER=$(echo "$RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
paging = d.get('paging', {}).get('next', {}).get('after', '')
print(paging)
" 2>/dev/null || echo "")

  if [[ -z "$AFTER" || "$RESULT_COUNT" -lt 100 ]]; then
    break
  fi
done

TOTAL=$(echo "$ALL_COMPANIES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo ""
echo "  Total companies with LinkedIn URL: ${TOTAL}"

# ----------------------------------------------------------------
# Step 2: Group by linkedin_company_url, find duplicates
# ----------------------------------------------------------------
echo ""
echo "Analyzing for duplicates..."

SCAN_RESULT=$(python3 -c "
import json
import sys
from collections import defaultdict

companies = json.load(sys.stdin)

# Group by normalized linkedin_company_url
url_groups = defaultdict(list)
for company in companies:
    props = company.get('properties', {})
    url = props.get('linkedin_company_url', '').strip().lower().rstrip('/')
    if url:
        url_groups[url].append({
            'id': company.get('id', props.get('hs_object_id', '')),
            'name': props.get('name', ''),
            'domain': props.get('domain', ''),
            'linkedin_company_url': props.get('linkedin_company_url', '')
        })

# Find duplicates (groups with count > 1)
duplicates = []
for url, group in url_groups.items():
    if len(group) > 1:
        # Sort by ID (lowest = keep, rest = merge candidates)
        group.sort(key=lambda x: int(x['id']) if x['id'].isdigit() else 0)
        duplicates.append({
            'linkedin_url': url,
            'count': len(group),
            'keep': group[0],
            'merge_candidates': group[1:],
            'companies': group
        })

# Sort by count (most duplicates first)
duplicates.sort(key=lambda x: x['count'], reverse=True)

result = {
    'scan_date': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'total_companies_scanned': len(companies),
    'unique_linkedin_urls': len(url_groups),
    'duplicate_groups_found': len(duplicates),
    'total_duplicate_records': sum(d['count'] - 1 for d in duplicates),
    'duplicates': duplicates
}

print(json.dumps(result, indent=2))
" <<< "$ALL_COMPANIES")

# ----------------------------------------------------------------
# Step 3: Save report and print summary
# ----------------------------------------------------------------
echo "$SCAN_RESULT" > "$OUTPUT_FILE"

DUPE_GROUPS=$(echo "$SCAN_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['duplicate_groups_found'])")
DUPE_RECORDS=$(echo "$SCAN_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['total_duplicate_records'])")
UNIQUE_URLS=$(echo "$SCAN_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['unique_linkedin_urls'])")

echo ""
echo "============================================================"
echo "  SCAN RESULTS"
echo "============================================================"
echo ""
echo "  Companies scanned:        ${TOTAL}"
echo "  Unique LinkedIn URLs:     ${UNIQUE_URLS}"
echo "  Duplicate groups found:   ${DUPE_GROUPS}"
echo "  Total duplicate records:  ${DUPE_RECORDS}"
echo ""

if [[ "$DUPE_GROUPS" -gt 0 ]]; then
  echo "  DUPLICATES DETECTED — review recommended"
  echo ""

  # Print each duplicate group
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for dup in data['duplicates']:
    print(f'  LinkedIn URL: {dup[\"linkedin_url\"]}')
    print(f'  Count: {dup[\"count\"]}')
    print(f'  Keep (lowest ID):')
    keep = dup['keep']
    print(f'    ID: {keep[\"id\"]}  Name: {keep[\"name\"]}  Domain: {keep[\"domain\"]}')
    print(f'  Merge candidates:')
    for mc in dup['merge_candidates']:
        print(f'    ID: {mc[\"id\"]}  Name: {mc[\"name\"]}  Domain: {mc[\"domain\"]}')
    print()
" <<< "$SCAN_RESULT"

  echo "  ACTION REQUIRED:"
  echo "  1. Review each duplicate group above"
  echo "  2. In HubSpot, merge duplicate companies (keep lowest ID)"
  echo "  3. WARNING: Merges are IRREVERSIBLE — verify before merging"
  echo ""
else
  echo "  No duplicates found. System is clean."
  echo ""
fi

echo "  Full report saved to: ${OUTPUT_FILE}"
echo ""
