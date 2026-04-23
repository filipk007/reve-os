---
model_tier: light
semantic_context: false
skip_defaults: true
context:
  - knowledge_base/frameworks/pvp.md
  - knowledge_base/_defaults/writing-style.md
  - clients/{{client_slug}}.md
---

# Email Generator — Signals Angle (PVP)

## Role
PVP cold email triggered by a named recent event. Pure insight, zero pitch.
Deliver one diagnostic the reader would pay for, invite them to confirm it.

## When to Use
`data.signals` is a non-empty array of signal objects.
Skill picks ONE best signal and writes around it.
If signals is empty/missing → return `confidence_score: 0.0`.

## Data Fields
Required: `signals` (array), `first_name`, `company_name`, `title`, `client_slug`
Useful: `domain`, `title`, `business_overview`, `business_positioning`, `linkedin_summary`

## Output
Return ONLY valid JSON:
```json
{
  "email_subject": "string, max 45 chars, lowercase",
  "email_body": "string, 55-85 words",
  "personalization_hook": "string",
  "angle_used": "signals",
  "signal_selected": {"headline": "string", "date": "YYYY-MM", "trigger": "string", "type": "string"},
  "angle_reasoning": "string, 1 sentence",
  "framework_notes": "string, 1 sentence on PVP application",
  "confidence_score": "number 0.0-1.0"
}
```

## Signal selection (rank by)
1. Recency: <90d best; <180d usable; >180d discard unless structurally permanent
2. Specificity: named event + named counterparty wins
3. Title match: does the prospect's role directly own the consequence?
4. Diagnostic clarity: can you name ONE concrete operational failure this event creates for this role?

Trigger → diagnostic angle:
- acquisition / M&A / MBO → reporting, data merge, stakeholder visibility
- funding / PE / Series raise → scaling mandate, attribution at new volume
- leadership change → audit window, 90-day mandate, vendor re-eval
- product launch → pipeline redesign, new data-capture needs
- rapid growth / hiring jump → ops breaks at new volume
- partnership / integration → technical integration work
- re-brand → content + CRM realignment

## Email structure (exactly 3 parts)
1. **Opener** — question referencing the signal, ends with `?`
2. **Diagnostic** — 2-4 short sentences naming what specifically breaks for someone in this role at this kind of event. Concrete parts of their system (reports, workflows, dashboards, pipelines, specific metrics)
3. **Test close** — ONE short question: "Does this track?" / "Am I onto something?" / "Or off-base?"

## Banned patterns (zero tolerance — automatic skill failure)
- Any sentence starting with "We ", "Our ", "I help", "I work with"
- Any mention of: audit, teardown, checklist, playbook, breakdown (as offered things)
- Any customer name (Paynt, Inbank, Global Dime, etc.)
- Any list of what the service does ("clean X, rebuild Y, retire Z")
- "happy to send", "worth a look?", "worth a conversation?", "worth exploring?"
- Any time-framed ask ("10-min look", "quick chat", "grab 15 minutes")
- Any case study reference, even unnamed ("similar client", "a scale-up we worked with")
- Em dashes

Writing a banned pattern = you're doing PVC, not PVP. Stop, delete the sentence, end the email on the diagnostic.

## Example

**Input:**
```json
{
  "first_name": "Mark",
  "company_name": "Kee Safety Group",
  "title": "Head of Marketing Operations",
  "client_slug": "crm-magnetics",
  "signals": [{"date": "2026-01", "headline": "Management Buyout of Kee Safety Group Ltd Supported by Intermediate Capital Group", "summary": "MBO backed by ICG", "trigger": "rapid_growth", "type": "acquisition"}]
}
```

**Output:**
```json
{
  "email_subject": "post-mbo reporting",
  "email_body": "Mark, the Kee Safety MBO with ICG closed in January?\n\nThe thing that usually breaks first for marketing ops post-MBO: reporting. New owners want numbers nobody built cleanly before. Legacy dashboards stop making sense in the new ownership structure. And workflows that were fine last year start misfiring because deal stages moved.\n\nAm I onto something, or off-base?",
  "personalization_hook": "January 2026 MBO with ICG",
  "angle_used": "signals",
  "signal_selected": {"headline": "Management Buyout of Kee Safety Group Ltd Supported by Intermediate Capital Group", "date": "2026-01", "trigger": "rapid_growth", "type": "acquisition"},
  "angle_reasoning": "Recent MBO + Head of Marketing Ops = reporting and workflow fallout lands directly on this role.",
  "framework_notes": "PVP: signal-as-question + diagnostic about marketing ops post-MBO. No pitch, no proof, no offer. Test close.",
  "confidence_score": 0.9
}
```
