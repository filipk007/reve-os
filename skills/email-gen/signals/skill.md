---
model_tier: light
semantic_context: false
skip_defaults: true
context:
  - knowledge_base/frameworks/pvc.md
  - knowledge_base/_defaults/writing-style.md
  - clients/{{client_slug}}.md
---

# Email Generator — Signals Angle

## Angle Positioning
For prospects where research surfaced a specific, named, recent event
(acquisition, funding, leadership change, product launch, geo expansion,
partnership). The signal does the heavy lifting for relevance; the email
connects signal → operational consequence → client's mechanism.

## When to Use
Payload `data.signals` is a non-empty array of signal objects:
`[{date, headline, summary, trigger, type}, ...]`

Skill picks ONE best signal from the array.

If `data.signals` is empty/missing: return `confidence_score: 0.0` with
`angle_reasoning` noting the routing mismatch. Clay's rule engine should
route signal-less prospects to a different angle.

## Data Fields
Required: `signals` (array), `first_name`, `company_name`, `title`, `client_slug`
Useful: `domain`, `employee_count`, `business_overview`, `linkedin_summary`

## Output Format
Return ONLY valid JSON:

```json
{
  "email_subject": "string, max 45 chars, lowercase",
  "email_body": "string, plain text, 75-110 words",
  "personalization_hook": "string — the specific signal detail",
  "angle_used": "signals",
  "signal_selected": {
    "headline": "string",
    "date": "string, YYYY-MM",
    "trigger": "string",
    "type": "string"
  },
  "angle_reasoning": "string",
  "framework_notes": "string",
  "confidence_score": "number 0.0-1.0"
}
```

## Angle-Specific Guidance

**Signal selection** — pick the ONE best signal scoring on:
1. **Recency** — <90 days best; <180 days usable; >180 days only if structurally permanent; >12 months discard
2. **Specificity** — named event + named counterparty + named mechanism wins
3. **Value-prop match** — does the signal create a buying moment that maps to the client's value proposition?
4. **Title match** — does the prospect's role own the consequence of this signal?
5. **Narrative clarity** — can you bridge signal → client offer in 2 sentences without 3+ logical leaps?

**Signal type → buying moment:**
- acquisition / M&A / MBO → reporting rebuild, data merge, stakeholder-reporting pressure
- funding / PE / Series raise → scaling mandate, tech upgrade, 18-month runway pressure
- leadership change (VP, CMO, CRO, RevOps) → audit window, 90-day mandate, vendor re-evaluation
- product launch / new line → pipeline redesign, new data-capture needs
- rapid growth / hiring jump → ops breaks at new volume
- partnership / integration → technical integration work
- re-brand → content + CRM realignment

**Writing rules:**
- Open on the signal, named. First line references the actual words.
- Don't congratulate as the point. One beat, then move to implication.
- Bridge signal → operational reality in one sentence.
- One mechanism reference from client's Social Proof, not a list.

## Critical Rules
- Never open with "saw / noticed / came across / I was looking at"
- Never "Most X we see Y" or "Teams like yours typically"
- Never "jump on a call / grab 15 minutes / book a slot"
- Never fabricate a signal if the array is empty — return confidence 0.0
- Under 110 words, no em dashes

## Example

**Input:**
```json
{
  "first_name": "Mark",
  "company_name": "Kee Safety Group",
  "title": "Head of Marketing Operations",
  "client_slug": "crm-magnetics",
  "signals": [
    {
      "date": "2026-01",
      "headline": "Management Buyout of Kee Safety Group Ltd Supported by Intermediate Capital Group",
      "summary": "MBO backed by ICG — ownership change after decade-long partnership.",
      "trigger": "rapid_growth",
      "type": "acquisition"
    }
  ]
}
```

**Output:**
```json
{
  "email_subject": "post-buyout, first 90 days",
  "email_body": "Mark, the Kee Safety MBO close with ICG happened in January?\n\nThe part that usually breaks first post-buyout: reporting. New owners ask for numbers nobody built properly before. Legacy workflows start misfiring. Marketing ops ends up rebuilding dashboards instead of running pipeline.\n\nWe rebuild HubSpot portals through that exact window. Clean ownership data, rebuild attribution, retire the workflows nobody remembers why exist.\n\nWorth a 10-min look at what usually breaks first post-buyout?",
  "personalization_hook": "January 2026 MBO backed by ICG",
  "angle_used": "signals",
  "signal_selected": {
    "headline": "Management Buyout of Kee Safety Group Ltd Supported by Intermediate Capital Group",
    "date": "2026-01",
    "trigger": "rapid_growth",
    "type": "acquisition"
  },
  "angle_reasoning": "Recent MBO creates reporting-and-ops consolidation window for Head of Marketing Ops. Named counterparty (ICG) adds credibility.",
  "framework_notes": "P: named signal + operational consequence. V: specific mechanism. C: diagnostic offer.",
  "confidence_score": 0.88
}
```
