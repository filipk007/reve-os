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

## Angle Positioning
For prospects where research surfaced a specific, named, recent event
(acquisition, funding, leadership change, product launch, geo expansion,
partnership). This skill uses the PVP framework — **no pitch, no proof,
no product mention in email 1.** The signal itself IS the relevance.
The email delivers one diagnostic observation the reader would pay for,
then invites them to confirm if the pain lands.

## When to Use
Payload `data.signals` is a non-empty array of signal objects:
`[{date, headline, summary, trigger, type}, ...]`

Skill picks ONE best signal from the array.

If `data.signals` is empty/missing: return `confidence_score: 0.0` with
`angle_reasoning` noting the routing mismatch. Clay's rule engine should
route signal-less prospects to a different angle.

## Data Fields
Required: `signals` (array), `first_name`, `company_name`, `title`, `client_slug`
Useful: `domain`, `employee_count`, `business_overview`, `business_positioning`,
`linkedin_summary`

## Output Format
Return ONLY valid JSON:

```json
{
  "email_subject": "string, max 45 chars, lowercase",
  "email_body": "string, plain text, 60-95 words",
  "personalization_hook": "string — the specific signal detail",
  "angle_used": "signals",
  "signal_selected": {
    "headline": "string",
    "date": "string, YYYY-MM",
    "trigger": "string",
    "type": "string"
  },
  "angle_reasoning": "string",
  "framework_notes": "string, how PVP was applied",
  "confidence_score": "number 0.0-1.0"
}
```

## Angle-Specific Guidance

**Signal selection** — pick the ONE best signal scoring on:
1. **Recency** — <90 days best; <180 days usable; >180 days only if structurally permanent; >12 months discard
2. **Specificity** — named event + named counterparty + named mechanism wins
3. **Title match** — does the prospect's role own the consequence of this signal?
4. **Diagnostic clarity** — can you name ONE specific operational consequence of this event that the prospect's role would feel directly? If you can't, pick a different signal.

**Signal type → diagnostic angle:**
- acquisition / M&A / MBO → reporting rebuild, data merge, stakeholder-reporting pressure
- funding / PE / Series raise → scaling mandate, tech upgrade, 18-month runway pressure
- leadership change → audit window, 90-day mandate, vendor re-evaluation
- product launch / new line → pipeline redesign, new data-capture needs
- rapid growth / hiring jump → ops breaks at new volume
- partnership / integration → technical integration work
- re-brand → content + CRM realignment

## PVP Writing Rules (strict — this is the whole skill)

1. **Opener is a question referencing the signal, verbatim as the prospect experienced it.** Ends with `?`. "the Acme acquisition closed in February?"
2. **One diagnostic sentence** — a specific operational thing that usually breaks for someone in this role at this kind of event. Concrete, not abstract.
3. **One or two sentences elaborating the mechanism** — what EXACTLY goes wrong, named parts of their system (duplicates, reporting, workflows, whatever fits).
4. **Invite confirmation, don't pitch.** End with a test question: "Does this land?" / "Am I onto something?" / "Anything to it?" / "Or off-base?"
5. **NO mentions of:** the client company, "we", "us", the client's product, case studies, customer names, numbers, metrics, offers, audits, meetings, demos, or anything that sounds like a pitch. The whole point of PVP is to deliver the insight without asking for anything.
6. **NO social proof.** Even indirectly ("we've seen this at..."). The diagnostic speaks for itself.
7. **The reader's next thought should be:** "how did they know this about us?" — not "what do they sell?"

## Critical Rules
- **Opener is a question**, not a statement. First line MUST end with `?`.
- **NO mentions of the sender's company, product, service, offer, or case studies.** Email 1 is insight only.
- Never open with "saw / noticed / came across / I was looking at"
- Never "Most X we see Y" or "Teams like yours typically"
- Never "jump on a call / grab 15 minutes / book a slot" or any time-framed ask
- Never fabricate a signal if the array is empty — return confidence 0.0
- Under 95 words, no em dashes

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
  "email_subject": "post-mbo reporting",
  "email_body": "Mark, the Kee Safety MBO with ICG closed in January?\n\nThe thing that usually breaks first for marketing ops post-MBO: reporting. New owners want numbers nobody built cleanly before. Legacy dashboards stop making sense in the new ownership structure.\n\nAnd the workflows that were fine last year start misfiring because they were built against deal stages that no longer exist.\n\nAm I onto something, or off-base?",
  "personalization_hook": "January 2026 MBO backed by ICG",
  "angle_used": "signals",
  "signal_selected": {
    "headline": "Management Buyout of Kee Safety Group Ltd Supported by Intermediate Capital Group",
    "date": "2026-01",
    "trigger": "rapid_growth",
    "type": "acquisition"
  },
  "angle_reasoning": "Recent MBO + Head of Marketing Ops = reporting and workflow fallout lands on this exact role. Signal is specific and named (ICG), role owns the consequence.",
  "framework_notes": "PVP: P (permission via named signal as question) + V (diagnostic insight about what breaks for marketing ops post-MBO) + zero pitch, zero proof. The reader reads this and thinks 'how did they know?' not 'what do they sell?'",
  "confidence_score": 0.9
}
```

**Output (second example — no matching named proof, shorter email):**

```json
{
  "email_subject": "series b, hiring pipeline",
  "email_body": "Priya, the €12M from Atomico closed last month?\n\nFirst 90 days post-raise usually land the same way for VP Growth: a hiring spree starts before attribution is set up to measure what's already working. Six months in, nobody knows which channel deserves the next euro.\n\nAnd when the board asks, the data tells three different stories depending on which dashboard you pull.\n\nDoes this track?",
  "personalization_hook": "€12M Series A from Atomico, scaling commercial",
  "angle_used": "signals",
  "signal_selected": {
    "headline": "Nova Biotech closes €12M Series A led by Atomico",
    "date": "2026-03",
    "trigger": "funding",
    "type": "funding_round"
  },
  "angle_reasoning": "Recent raise + VP Growth = attribution-at-scale pain within the role's direct responsibility window. No proof needed — the observation itself earns the reply.",
  "framework_notes": "PVP: named signal as question + one-two diagnostic observations on a specific VP-Growth-at-Series-A pain. No 'we', no proof, no pitch.",
  "confidence_score": 0.88
}
```
