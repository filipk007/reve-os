---
model_tier: light
semantic_context: false
skip_defaults: true
context:
  - knowledge_base/frameworks/pvc.md
  - knowledge_base/_defaults/writing-style.md
  - clients/{{client_slug}}.md
---

# Email Generator — New Hire Angle

## Angle Positioning
For prospects who recently started a new role (typically <120 days in seat).
The new-hire window is rare leverage: they have a mandate, they're still
auditing what the last team left behind, and vendor re-evaluation is on the
table in ways that senior tenure rarely permits.

## When to Use
Signals: `new_hire_lt_90d`, `new_hire_lt_180d`, title change date within
last 120 days, LinkedIn first-week posts, "recently joined" / "excited to
announce" language. Senior IC or leader roles (VP, Head of, Director, CMO,
CRO, CTO).

If these signals are missing, set `confidence_score < 0.5` and note it in
`angle_reasoning`.

## Data Fields
Required: `first_name`, `company_name`, `title`, `client_slug`
Useful: `domain`, `employee_count`, `business_overview`, `business_positioning`,
`signals`, `linkedin_summary`

## Output Format
Return ONLY valid JSON:

```json
{
  "email_subject": "string, max 45 chars, lowercase",
  "email_body": "string, plain text, 65-95 words, 3-4 short paragraphs",
  "personalization_hook": "string — the specific new-hire detail referenced",
  "angle_used": "new-hire",
  "angle_reasoning": "string, 1 sentence on why new-hire fits this prospect",
  "framework_notes": "string, how PVC was applied",
  "confidence_score": "number 0.0-1.0"
}
```

## Angle-Specific Guidance

**Hook patterns for this angle** (pick what fits, don't template):
- Reference the fresh-audit window. Frame the role transition as the moment
  when what the last team left gets surfaced.
- Reference the 90-day mandate implicitly, not explicitly. Avoid corporate
  "first 90 days" MBA-speak.
- Name the prior-employer carry-over if known ("coming from {prev-company}'s
  playbook to building your own").

**What to cite from client's Social Proof:**
One named customer whose outcome maps to the fresh-audit moment. Pull the
customer name and their specific mechanism/number. Example from Fivefox:
"Inbank rebuilt tracking and 2.7x'd loan volume in 3 months."

**CTA nuance:**
Offer a diagnostic (audit checklist, teardown, playbook). Not a meeting.

## Critical Rules
- Never open with "saw / noticed / came across / I was looking at"
- Never "Most X we see Y" or "Teams like yours typically"
- Never "jump on a call / grab 15 minutes / book a slot"
- Never "welcome aboard" (patronizing from a stranger)
- Under 95 words, 3-4 short paragraphs, no em dashes

## Example

**Input:**
```json
{
  "first_name": "Sarah",
  "company_name": "Paynt",
  "title": "VP of Growth",
  "signals": ["new_hire_lt_90d", "hiring_paid_media_lead"],
  "linkedin_summary": "Joined Paynt as VP Growth in Jan. Previously led Growth at Revolut.",
  "client_slug": "fivefox-fintech"
}
```

**Output:**
```json
{
  "email_subject": "paynt, first 90 days",
  "email_body": "Sarah, 3 months into Paynt. Usually by month 3 the VP Growth audit surfaces what the last team left broken in tracking.\n\nOne quick one: if Paynt is optimizing for applications rather than funded loans, the CAPI event schema is probably where the gap sits. We rebuilt Inbank's and 2.7x'd loan volume in 3 months.\n\nHappy to send the audit checklist. Tells you in 20 min whether the funnel is leaking between the click and the funded loan.\n\nWorth a look?",
  "personalization_hook": "New VP Growth at Paynt, 3 months in, audit window",
  "angle_used": "new-hire",
  "angle_reasoning": "Explicit new_hire_lt_90d signal + senior growth role + hiring paid media lead = prime audit window with active mandate.",
  "framework_notes": "P: new-hire audit window. V: specific tracking gap + Inbank proof. C: audit checklist offer, not meeting ask.",
  "confidence_score": 0.91
}
```
