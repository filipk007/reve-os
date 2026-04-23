---
model_tier: light
semantic_context: false
skip_defaults: true
context:
  - knowledge_base/frameworks/pvc.md
  - knowledge_base/_defaults/writing-style.md
  - clients/{{client_slug}}.md
---

# Email Generator — Funded Loan Gap (Fivefox-specific)

## Angle Positioning
Fivefox-specific angle for licensed digital lenders running paid media with
mediocre conversion-to-funded ratio. The wedge: "you're optimizing for
applications, not funded loans." Maps to Fivefox's CAPI + tracking-
infrastructure value proposition.

## When to Use
Signals: active paid media (Meta/Google/TikTok) + mediocre results, OR
no CAPI implementation, OR recently parted with previous agency, OR
high spend with weak backend tracking. Lender vertical only.

If prospect isn't a licensed digital lender, set `confidence_score < 0.4`
and flag the mismatch in `angle_reasoning`.

## Data Fields
Required: `first_name`, `company_name`, `title`, `client_slug`
Useful: `domain`, `employee_count`, `is_running_ads`, `linkedin_summary`

## Output Format
Return ONLY valid JSON:

```json
{
  "email_subject": "string, max 40 chars, lowercase",
  "email_body": "string, plain text, 75-125 words",
  "personalization_hook": "string",
  "angle_used": "fivefox-funded-loan-gap",
  "angle_reasoning": "string",
  "framework_notes": "string",
  "confidence_score": "number 0.0-1.0"
}
```

## Angle-Specific Guidance

**Hook patterns:**
- Lead on the metric gap: applications vs. funded loans.
- Reference CAPI / backend event schema / tracking infrastructure as the
  mechanism, not a buzzword.
- If language signal suggests NL/BE, write in Dutch using terms from the
  Fivefox client profile's Tone Preferences.

**Proof to cite:**
Paynt first (3.4x application completions, 42% CAC drop, CAPI + event
schema rebuild). Fallback: Inbank (2.7x loan volume, 3 months, consent
retargeting). Cite by name + specific number.

**CTA nuance:**
Diagnostic offer only. "Audit checklist", "teardown we did for Paynt",
"want the walkthrough?". Never quantify time (no "20-min look", no
"quick 15 min"). Never "book a call".

## Critical Rules
- Never open with "saw / noticed / came across"
- Never "Most X we see Y" or "Teams like yours typically"
- Never "jump on a call / grab 15 minutes / book a slot"
- Never "AI-powered", "AI-driven", "full-service", "growth partner"
- Must reference a specific number (3.4x, 42%, 2.7x)
- Under 125 words, no em dashes, UK/EU peer tone

## Example

**Input:**
```json
{
  "first_name": "Emma",
  "company_name": "LendCo",
  "title": "Head of Growth",
  "client_slug": "fivefox-fintech",
  "is_running_ads": true
}
```

**Output:**
```json
{
  "email_subject": "funded loans vs applications",
  "email_body": "Emma, quick diagnostic question: when you report on LendCo's paid media performance, is the number applications or funded loans?\n\nIf it's applications, the CAPI event schema is probably where the gap sits. Most lender ad accounts optimize against the click-to-application conversion and bleed 30-40% of actual funded volume between the form fill and the decisioning backend.\n\nPaynt rebuilt their event schema to fire on approved completions and hit 3.4x application completions with a 42% CAC drop. Happy to send the teardown.\n\nWorth a look?",
  "personalization_hook": "Running paid ads + Head of Growth role at a lender",
  "angle_used": "fivefox-funded-loan-gap",
  "angle_reasoning": "Active paid media + Head of Growth title = prime funnel-tracking audit target. Defaults to Paynt proof given UK/EU fit.",
  "framework_notes": "P: diagnostic question reframing the metric. V: CAPI event schema + Paynt proof. C: teardown offer.",
  "confidence_score": 0.82
}
```
