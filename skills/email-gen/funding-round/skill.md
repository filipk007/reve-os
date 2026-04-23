---
model_tier: light
semantic_context: false
skip_defaults: true
context:
  - knowledge_base/frameworks/pvc.md
  - knowledge_base/_defaults/writing-style.md
  - clients/{{client_slug}}.md
---

# Email Generator — Funding Round Angle

## Angle Positioning
For prospects whose company recently closed a funding round (Series A-E,
PE investment, MBO). A raise creates an 18-month runway pressure — the
new board expects operational maturity within a specific window, and
the people closest to that mandate are buying partners, not vendors.

## When to Use
Signals: `funding_round_lt_180d`, recent announcement press, "just raised",
specific round types (Series A-E, PE investment). Best fit: titles that
own commercial scaling (VP Growth, CMO, CRO, Head of Revenue).

If signal is stale (>180 days) or vague, set `confidence_score < 0.5`.

## Data Fields
Required: `first_name`, `company_name`, `title`, `client_slug`, `signals`
Useful: `domain`, `employee_count`, `business_overview`, `linkedin_summary`

## Output Format
Return ONLY valid JSON:

```json
{
  "email_subject": "string, max 45 chars, lowercase",
  "email_body": "string, plain text, 65-95 words",
  "personalization_hook": "string — the specific raise detail",
  "angle_used": "funding-round",
  "angle_reasoning": "string",
  "framework_notes": "string",
  "confidence_score": "number 0.0-1.0"
}
```

## Angle-Specific Guidance

**Hook patterns:**
- Reference the raise amount + lead investor by name.
- Bridge to the specific post-raise failure pattern their role sees first.
- Keep the tone diagnostic, not congratulatory. "Congrats" is a beat, not
  the email.

**What to cite from client's Social Proof:**
One named customer who was in a similar post-raise state. Pull the specific
number (not "3x results" but "2.7x loan volume in 3 months").

**CTA nuance:**
Offer the teardown or reference the pattern — never the meeting.

## Critical Rules
- Never open with "saw / noticed / came across"
- Never "Most X we see Y" or "Teams like yours typically"
- Never "jump on a call / grab 15 minutes"
- Don't over-congratulate — one line max, then move to substance
- Under 95 words, no em dashes

## Example

**Input:**
```json
{
  "first_name": "Priya",
  "company_name": "Nova Biotech",
  "title": "VP Growth",
  "signals": ["funding_round_lt_180d"],
  "client_slug": "fivefox-fintech"
}
```

**Output:**
```json
{
  "email_subject": "12m series a, scaling commercial",
  "email_body": "Priya, the €12M from Atomico last month. The DACH commercial expansion is the hard part.\n\nMost Series A teams over-invest in paid media the first 90 days before attribution is set up to measure what's driving pipeline. The result: 6 months in, nobody knows which channel deserves the next euro.\n\nWorth a look at how we structured attribution for Inbank in this exact window? Happy to send the teardown.",
  "personalization_hook": "€12M Series A from Atomico, DACH scaling",
  "angle_used": "funding-round",
  "angle_reasoning": "Recent Series A + explicit commercial scaling mandate hits VP Growth directly.",
  "framework_notes": "P: raise + post-raise failure pattern. V: attribution + Inbank proof. C: teardown offer.",
  "confidence_score": 0.91
}
```
