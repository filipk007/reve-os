#!/usr/bin/env bash
# =============================================================================
# 06-create-routing-properties.sh
# Phase 2 — Create additional HubSpot properties for All-in-Clay routing
#
# Creates:
#   - company_association_resolved (boolean) on Contacts
#     Gates the decision tree — prevents premature owner assignment
#   - routing_confidence (string/text) on Contacts
#     Values: high | medium | low — determines HITL review routing
#
# Prerequisites:
#   - 02-create-properties.sh already run (contact_routing group exists)
#   - HUBSPOT_ACCESS_TOKEN exported
#
# Usage:
#   export HUBSPOT_ACCESS_TOKEN="pat-na1-xxxxxxxxxxxx"
#   bash scripts/hubspot-setup/06-create-routing-properties.sh
#
# Dry run (shows what would be created, doesn't call API):
#   DRY_RUN=true bash scripts/hubspot-setup/06-create-routing-properties.sh
# =============================================================================

set -euo pipefail

if [[ -z "${HUBSPOT_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: HUBSPOT_ACCESS_TOKEN is not set."
  echo "       export HUBSPOT_ACCESS_TOKEN=\"pat-na1-xxxxxxxxxxxx\""
  exit 1
fi

TOKEN="$HUBSPOT_ACCESS_TOKEN"
BASE="https://api.hubapi.com"
DRY_RUN="${DRY_RUN:-false}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "DRY RUN MODE — no API calls will be made."
fi

echo ""
echo "============================================================"
echo "  HubSpot Property Creation"
echo "  Phase 2: Routing Properties"
echo "============================================================"
echo ""

# ----------------------------------------------------------------
# Helper: create or skip (idempotent — 409 conflict = already exists)
# ----------------------------------------------------------------
create_or_skip() {
  local label="$1"
  local method="$2"
  local url="$3"
  local body="$4"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [DRY RUN] Would create: ${label}"
    echo "            ${method} ${url}"
    return
  fi

  local http_status
  local response_body
  response_body=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body")

  http_status=$(echo "$response_body" | tail -1)
  response_body=$(echo "$response_body" | head -n -1)

  case "$http_status" in
    200|201)
      echo "  [CREATED] ${label}"
      ;;
    409)
      echo "  [EXISTS]  ${label}  (already exists — skipped)"
      ;;
    *)
      echo "  [ERROR]   ${label}  HTTP ${http_status}"
      echo "  Response: $(echo "$response_body" | python3 -m json.tool 2>/dev/null || echo "$response_body")"
      ;;
  esac
}

# ================================================================
# STEP 1: Ensure contact_routing group exists (idempotent)
# ================================================================
echo "=== Step 1: Ensure Property Group Exists ==="
echo ""

create_or_skip \
  "contacts/groups/contact_routing" \
  "POST" \
  "${BASE}/crm/v3/properties/contacts/groups" \
  '{"name": "contact_routing", "label": "Contact Routing", "displayOrder": -1}'

# ================================================================
# STEP 2: Create routing properties
# ================================================================
echo ""
echo "=== Step 2: Routing Properties ==="
echo ""

# company_association_resolved on Contacts (boolean)
create_or_skip \
  "contacts.company_association_resolved" \
  "POST" \
  "${BASE}/crm/v3/properties/contacts" \
  '{
    "groupName": "contact_routing",
    "name": "company_association_resolved",
    "label": "Company Association Resolved",
    "type": "enumeration",
    "fieldType": "booleancheckbox",
    "description": "Set to true by Clay after contact is associated to correct company. Gates the decision tree for owner assignment.",
    "options": [
      {"label": "True", "value": "true", "displayOrder": 0},
      {"label": "False", "value": "false", "displayOrder": 1}
    ]
  }'

# routing_confidence on Contacts (string/text)
create_or_skip \
  "contacts.routing_confidence" \
  "POST" \
  "${BASE}/crm/v3/properties/contacts" \
  '{
    "groupName": "contact_routing",
    "name": "routing_confidence",
    "label": "Routing Confidence",
    "type": "enumeration",
    "fieldType": "select",
    "description": "Confidence level of the automated routing. Low = routed to manual review queue.",
    "options": [
      {"label": "High", "value": "high", "displayOrder": 0},
      {"label": "Medium", "value": "medium", "displayOrder": 1},
      {"label": "Low", "value": "low", "displayOrder": 2}
    ]
  }'

echo ""
echo "============================================================"
echo "  Verification: confirm in HubSpot UI"
echo "  Settings → Properties → search \"company_association_resolved\""
echo "    - Should appear under Contacts"
echo "    - Type: Boolean checkbox"
echo "    - Group: Contact Routing"
echo "  Settings → Properties → search \"routing_confidence\""
echo "    - Should appear under Contacts"
echo "    - Type: Dropdown select (high/medium/low)"
echo "    - Group: Contact Routing"
echo "============================================================"
echo ""

if [[ "$DRY_RUN" != "true" ]]; then
  echo "Running quick API verification..."
  echo ""
  for prop in company_association_resolved routing_confidence; do
    status=$(curl -s -o /dev/null -w "%{http_code}" \
      "${BASE}/crm/v3/properties/contacts/${prop}" \
      -H "Authorization: Bearer ${TOKEN}")
    [[ "$status" == "200" ]] && echo "  [OK] contacts.${prop} exists" || echo "  [WARN] contacts.${prop} returned HTTP ${status}"
  done
  echo ""
fi
