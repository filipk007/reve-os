# Context Layer v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the email-gen context stack into 3 layers (frameworks / writing-style / angle skill) with zero content overlap. Ship a new consolidated writing-style.md, a new PVP framework file, a renamed+trimmed PVC file, and rewritten versions of all 4 angle skills.

**Architecture:** Strict 3-layer separation. Frameworks are swappable per skill. Writing-style is a single source-of-truth voice bible. Skills contain angle-specific copy only, with a short "Critical Rules" block for emphasis on top constraints. Design spec: `docs/superpowers/specs/2026-04-23-context-layer-v2-design.md`.

**Tech Stack:** Markdown content files, existing FastAPI backend + skill_loader (already supports the new shape), curl for smoke testing, git for commits.

---

## File Structure

**Files created:**
- `knowledge_base/frameworks/pvp.md` — new framework (~45 lines)

**Files renamed:**
- `knowledge_base/frameworks/josh-braun-pvc.md` → `knowledge_base/frameworks/pvc.md`

**Files rewritten:**
- `knowledge_base/frameworks/pvc.md` — trimmed, 71 → ~35 lines
- `knowledge_base/_defaults/writing-style.md` — full rewrite, 50 → ~170 lines
- `skills/email-gen/new-hire/skill.md` — ~80 lines
- `skills/email-gen/funding-round/skill.md` — ~80 lines
- `skills/email-gen/signals/skill.md` — ~80 lines (was 245; big trim)
- `skills/email-gen/fivefox-funded-loan-gap/skill.md` — ~80 lines

**Files updated (minor):**
- All 4 angle skill frontmatter: `context:` ref `josh-braun-pvc.md` → `pvc.md`

**Source material (read-only inputs):**
- `/Users/filipkostkiewicz/projects/copywriter/campaigns/test-campaign/bestpractices.md` (185 lines)
- `/Users/filipkostkiewicz/youtube transcripts/yt/$1M MESSAGES.md` (THEORY section, lines 77-265)
- `/Users/filipkostkiewicz/Desktop/RESOURCES/MDs/Video Summary - PVP.md` (61 lines)
- `/Users/filipkostkiewicz/Desktop/RESOURCES/MDs/Video Summary - Seller-Centric vs. Buyer-Centric Communication.md` (53 lines)
- `/Users/filipkostkiewicz/Desktop/RESOURCES/MDs/Video Summary - 3-Step Human Personalized Email Sequence.md` (61 lines) — reference only, specific to restaurant case study

---

## Testing Strategy

No unit tests (these are prompt/content files, not code). Verification via:
1. **Structural grep checks** — confirm sections exist, removed content is gone
2. **Line count checks** — confirm each file is within target range
3. **Frontmatter validation** — Python YAML parse on every skill.md
4. **Smoke test** — curl each of the 4 angle skills against `/webhook` on VPS, confirm valid email JSON returns

---

## Task 1: Write new `knowledge_base/_defaults/writing-style.md`

**Files:**
- Modify: `knowledge_base/_defaults/writing-style.md` (full rewrite, 50 → ~170 lines)

**Target structure** (12 sections):

| # | Section | Target lines | Source |
|---|---|---|---|
| 1 | `## North Star` | ~5 | bestpractices.md lines 7-9 |
| 2 | `## Buyer-Centric Mindset` | ~10 | bestpractices.md lines 12-24 |
| 3 | `## Nine Psychological Levers` | ~40 | $1M MESSAGES.md lines 92-149 + bestpractices.md lines 45-63 |
| 4 | `## Opening Line Rule` | ~8 | bestpractices.md lines 67-73 + user's spec input |
| 5 | `## Forbidden Phrases` | ~30 | bestpractices.md lines 110-124 |
| 6 | `## Disarming Language (Whitelist)` | ~15 | bestpractices.md lines 77-92 |
| 7 | `## CTA Patterns` | ~10 | bestpractices.md lines 97-105 |
| 8 | `## Structure Rules` | ~8 | bestpractices.md lines 67-73 |
| 9 | `## Subject Line Rules` | ~10 | bestpractices.md lines 129-144 |
| 10 | `## Follow-Up Rules` | ~10 | bestpractices.md lines 146-156 |
| 11 | `## Personalization Stacking` | ~8 | bestpractices.md lines 160-174 |
| 12 | `## Self-Interest Check` | ~5 | bestpractices.md lines 178-184 |

**Critical content (must be verbatim or very close):**

Section 4 `## Opening Line Rule` MUST include:
- Ban on starting with "saw / noticed / came across / I was looking at"
- The "first line = preview text, looks internal" principle
- The "drop-the-verb" fix pattern, with a concrete example:
  ```
  BAD:  "Mark, saw the Kee Safety MBO close with ICG in January. Congrats."
  GOOD: "Mark, the Kee Safety MBO in January. Since then..."
  ```

Section 5 `## Forbidden Phrases` MUST include (grouped by category):
- Generic openers: "Hope you're well", "Hope this finds you", "Just checking in", "I wanted to reach out", "I noticed that", "Noticed...", "Saw...", "Came across..."
- Overused adjectives: Impressive, innovative, cutting edge, industry leading, best in class, revolutionary, game changing, robust, seamless, unique, powerful
- Business jargon: Leverage, optimise, streamline, synergy, scale, pain points, value proposition, best practices, circle back, touch base, low hanging fruit, move the needle
- Pushy: Limited time offer, act now, limited spots, don't miss out, once in a lifetime
- Vague claims: 10x your results, skyrocket your growth, transform your business, guaranteed success
- Lazy follow-ups: Just following up, Following up, Bumping this, Circling back, Friendly reminder
- Sequence-aware openers (any phrase that acknowledges this is a sequence)
- **Vendor-speak patterns**: "Most X we see Y", "Teams like yours", "Companies in your space typically"

Section 7 `## CTA Patterns` MUST include both:
- Use (whitelist): Self-aware closer, Disarming question, No CTA
- Never use: "Jump on a quick call", "Grab 15 minutes", "Book a slot in my calendar"

**Frontmatter preserved:**
```yaml
---
name: WRITING_STYLE
description: Voice and tone guidelines for all written output
domain: methodology
node_type: pattern
status: validated
last_updated: 2026-04-23
tags:
  - methodology
  - voice
  - copywriting
---
```

- [ ] **Step 1: Read all source files**

```bash
cat /Users/filipkostkiewicz/projects/copywriter/campaigns/test-campaign/bestpractices.md
sed -n '77,265p' "/Users/filipkostkiewicz/youtube transcripts/yt/\$1M MESSAGES.md"
```

- [ ] **Step 2: Write the full new file**

Write `knowledge_base/_defaults/writing-style.md` with all 12 sections per the structure above. Each section's target line count is approximate; keep tight, no filler. Section 4 and 5 content above is mandatory.

- [ ] **Step 3: Verify section count**

```bash
grep -c "^## " knowledge_base/_defaults/writing-style.md
```
Expected: `12`

- [ ] **Step 4: Verify line count in range**

```bash
wc -l knowledge_base/_defaults/writing-style.md
```
Expected: between 150 and 200 lines.

- [ ] **Step 5: Verify the Kee Safety opening-line example is present**

```bash
grep -c "Kee Safety" knowledge_base/_defaults/writing-style.md
```
Expected: at least `1`.

- [ ] **Step 6: Commit**

```bash
cd /Users/filipkostkiewicz/projects/clay-webhook-os
git add knowledge_base/_defaults/writing-style.md
git commit -m "refactor(writing-style): full rewrite — voice bible consolidating bestpractices + \$1M MESSAGES theory

12 sections: North Star, buyer-centric mindset, nine psychological
levers, opening line rule, forbidden phrases, disarming language,
CTA patterns, structure, subject lines, follow-ups, personalization,
self-interest check.

Adds the opening-line ban (saw/noticed/came across) with drop-the-
verb fix pattern. Adds vendor-speak pattern ban ('Most X we see Y').

50 → ~170 lines. Consolidates rules that were previously duplicated
across frameworks/josh-braun-pvc.md, skill files, and client profiles."
```

---

## Task 2: Create `knowledge_base/frameworks/pvp.md`

**Files:**
- Create: `knowledge_base/frameworks/pvp.md` (~45 lines)

**Source material:**
- `Desktop/RESOURCES/MDs/Video Summary - PVP.md` (primary)
- `Desktop/RESOURCES/MDs/Video Summary - Seller-Centric vs. Buyer-Centric Communication.md` (supporting)

**Target content:**

```markdown
---
name: PVP_FRAMEWORK
description: Permissionless Value Prop — buyer-centric framework for cold email
domain: methodology
node_type: framework
status: validated
last_updated: 2026-04-23
tags:
  - methodology
  - cold-email
  - outbound
  - buyer-centric
related_concepts:
  - "[[pvc]]"
  - "[[writing-style]]"
---

# Permissionless Value Prop (PVP)

A buyer-centric framework built on a single test: *if I charged money for
this message, would the recipient feel it was worth it?*

PVP skips the "earn permission" step of traditional cold email by delivering
value so specific and so tied to the reader's current operational reality
that relevance is instant and trust is pre-earned.

## Core Shift: From ICP to ISCP

Traditional cold email targets by *who they are* — Ideal Customer Profile
(demographics: industry, size, geography, title).

PVP targets by *what situation they are currently in* — **Ideal Situation
Customer Profile (ISCP)**. The situation is the qualifier.

- **ICP list:** "Software company, 100 employees, NA-based"
- **ISCP list:** "Software company that just closed Series B, has paid
  hiring velocity in GTM roles, and is running three HR tools whose
  integrations are breaking"

## Existential Data Points

The ISCP is activated by **existential data points** — specific, public (or
researchable) facts that prove you know exactly what the reader is dealing
with right now. Permit filings, regulation dates, equipment status, recent
hires, funding rounds, tech stack changes, legal rulings.

The bar: *the reader reads the first line and thinks "how did they know
that about us?"*

## The Three Shifts

1. **From capability to situation.** Don't lead with what you do. Lead with
   what they're currently facing.
2. **From generic pain to quantified pain.** "Your CRM is probably messy"
   is dismissable. "Running demos as your primary CTA without a public SLA
   on response time means leads leak between click and call" is not.
3. **From requesting a meeting to delivering information.** Email 1 asks
   for nothing. It gives a diagnosis or an opportunity the reader would
   pay for.

## Case Study: WingWork

- **Existential data point:** FAA rule AD 2025-06-03 forces operators of
  BR710-engine aircraft to perform specific maintenance
- **Traditional message:** "Streamline your aviation maintenance processes"
- **PVP message:** *"FAA rule AD 2025-06-03 will force you to pay $11M in
  repairs for your BR710 fleet. Good news: we can check every engine for
  just $8k."*

The product (engine inspection service) is the obvious solution only
*after* the buyer acknowledges the validity and urgency of the data.

## When to Use PVP (vs PVC)

- **PVP** when you have (or can research) a real existential data point
  per prospect. Best for high-signal lists. Slower to produce; higher
  reply rates; fits one-to-one outbound at low volume.
- **PVC** when you're at volume without per-prospect existential data.
  Relies on general relevance (role, company state, recent news at a
  broader level).

## Evidence
[VERIFIED: Sourced from Video Summary - PVP.md and Video Summary -
Seller-Centric vs. Buyer-Centric Communication.md]
```

- [ ] **Step 1: Create the file with the content above**

- [ ] **Step 2: Verify line count**

```bash
wc -l knowledge_base/frameworks/pvp.md
```
Expected: between 40 and 60 lines.

- [ ] **Step 3: Verify the WingWork case study is present**

```bash
grep -c "WingWork\|BR710" knowledge_base/frameworks/pvp.md
```
Expected: at least `2`.

- [ ] **Step 4: Commit**

```bash
cd /Users/filipkostkiewicz/projects/clay-webhook-os
git add knowledge_base/frameworks/pvp.md
git commit -m "feat(frameworks): add PVP (Permissionless Value Prop) framework

New framework alongside PVC. Skill files can opt into either via their
context: frontmatter refs. PVP is buyer-centric — ISCP + existential
data points. Best for low-volume high-signal outbound.

Sourced from user's Video Summary notes on PVP and Seller-Centric
vs. Buyer-Centric Communication."
```

---

## Task 3: Rename + trim `josh-braun-pvc.md` → `pvc.md`

**Files:**
- Rename: `knowledge_base/frameworks/josh-braun-pvc.md` → `knowledge_base/frameworks/pvc.md`
- Rewrite: `knowledge_base/frameworks/pvc.md` (71 → ~35 lines)

**Content removed (moved to writing-style.md already in Task 1):**
- Entire `## Key Principles` section (length, subject line, buzzwords, text-from-friend)
- Entire `## Anti-Patterns` section

**Target content:**

```markdown
---
name: PVC_FRAMEWORK
description: Josh Braun's Permission-Value-CTA framework for cold outbound
domain: methodology
node_type: framework
status: validated
last_updated: 2026-04-23
tags:
  - methodology
  - cold-email
  - outbound
related_concepts:
  - "[[pvp]]"
  - "[[writing-style]]"
---

# Josh Braun PVC Framework

A cold email framework built on the principle that nobody wants to be sold
to, but everyone wants to be helped.

## The Three Components

### P — Permission
Earn the right to their attention before asking for anything. Reference
THEIR world, not yours. Show you've done homework.

**Good:** "Lattice just closed Series D — scaling enterprise post-raise is
a whole different game."
**Bad:** "I'm reaching out because we help companies like yours..."

The permission line should make them think: "This person actually looked at
what I'm doing."

### V — Value
One sentence connecting what you do to what they care about. Be specific
to their situation.

**Good:** "We help teams build outbound engines that don't break at scale,
without adding headcount faster than pipeline."
**Bad:** "Our AI-powered platform increases conversion rates by 3x."

### C — CTA
Low-friction. A question, not a demand. Give them an easy way to say yes
without committing to much.

**Good:** "Worth exploring?" / "Worth a quick look?" / "Make sense to chat?"
**Bad:** "Let's schedule a 30-minute demo this Thursday at 2pm."

## When to Use PVC (vs PVP)

- **PVC** when you're at volume without per-prospect existential data.
  Relies on role + company state + recent news at a broader level.
- **PVP** when you have a real existential data point per prospect.
  See `pvp.md`.

## Evidence
[VERIFIED: Josh Braun's LinkedIn content + "Badass B2B Growth Guide"]
```

- [ ] **Step 1: Rename the file**

```bash
cd /Users/filipkostkiewicz/projects/clay-webhook-os
git mv knowledge_base/frameworks/josh-braun-pvc.md knowledge_base/frameworks/pvc.md
```

- [ ] **Step 2: Overwrite with the trimmed content above**

- [ ] **Step 3: Verify the "Key Principles" and "Anti-Patterns" sections are gone**

```bash
grep -c "Key Principles\|Anti-Patterns" knowledge_base/frameworks/pvc.md
```
Expected: `0`.

- [ ] **Step 4: Verify line count**

```bash
wc -l knowledge_base/frameworks/pvc.md
```
Expected: between 30 and 45 lines.

- [ ] **Step 5: Commit (rename + content change in one commit since they're coupled)**

```bash
git add knowledge_base/frameworks/pvc.md
git commit -m "refactor(frameworks): rename josh-braun-pvc → pvc, trim to methodology only

Strip Key Principles (length/subject/buzzwords) and Anti-Patterns
sections — both now live in writing-style.md as the single source
of truth for voice rules. PVC file retains methodology + good/bad
example per component only.

71 → ~35 lines. Adds 'When to Use PVC vs PVP' crossref."
```

---

## Task 4: Rewrite `skills/email-gen/new-hire/skill.md`

**Files:**
- Rewrite: `skills/email-gen/new-hire/skill.md` (~80 lines)

**Target content:**

````markdown
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
````

- [ ] **Step 1: Overwrite the file with the content above**

- [ ] **Step 2: Verify line count**

```bash
wc -l skills/email-gen/new-hire/skill.md
```
Expected: between 70 and 100 lines.

- [ ] **Step 3: Verify frontmatter has exactly 3 context refs**

```bash
python3 -c "
import yaml
with open('skills/email-gen/new-hire/skill.md') as f:
    content = f.read()
fm = content.split('---')[1]
data = yaml.safe_load(fm)
refs = data.get('context', [])
assert len(refs) == 3, f'Expected 3 context refs, got {len(refs)}: {refs}'
assert any('pvc.md' in r for r in refs), 'Missing pvc.md ref'
assert any('writing-style.md' in r for r in refs), 'Missing writing-style.md ref'
assert any('{{client_slug}}' in r for r in refs), 'Missing client_slug ref'
print('OK')
"
```
Expected: `OK`

- [ ] **Step 4: Verify Critical Rules has 5-7 bullets**

```bash
awk '/^## Critical Rules/,/^## /' skills/email-gen/new-hire/skill.md | grep -c '^- '
```
Expected: between `5` and `7`.

- [ ] **Step 5: Commit**

```bash
git add skills/email-gen/new-hire/skill.md
git commit -m "refactor(skills): rewrite email-gen/new-hire to v2 template

Strip voice/tone/anti-patterns (now in writing-style.md). Add
Angle Positioning + Critical Rules block. Framework ref updated
pvc.md. One complete example kept.

109 → ~85 lines."
```

---

## Task 5: Rewrite `skills/email-gen/funding-round/skill.md`

**Files:**
- Rewrite: `skills/email-gen/funding-round/skill.md` (~80 lines)

**Target content:**

````markdown
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
````

- [ ] **Step 1: Overwrite the file with the content above**

- [ ] **Step 2: Verify line count**

```bash
wc -l skills/email-gen/funding-round/skill.md
```
Expected: between 70 and 100 lines.

- [ ] **Step 3: Verify frontmatter + Critical Rules**

```bash
python3 -c "
import yaml
with open('skills/email-gen/funding-round/skill.md') as f:
    content = f.read()
fm = content.split('---')[1]
data = yaml.safe_load(fm)
assert len(data.get('context', [])) == 3
print('OK')
"
awk '/^## Critical Rules/,/^## /' skills/email-gen/funding-round/skill.md | grep -c '^- '
```
Expected: `OK`, then a number between 5 and 7.

- [ ] **Step 4: Commit**

```bash
git add skills/email-gen/funding-round/skill.md
git commit -m "refactor(skills): rewrite email-gen/funding-round to v2 template"
```

---

## Task 6: Rewrite `skills/email-gen/signals/skill.md`

**Files:**
- Rewrite: `skills/email-gen/signals/skill.md` (was 245 lines — biggest trim)

**Target content:**

````markdown
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
  "email_body": "Mark, the Kee Safety MBO with ICG in January. The part that usually breaks first: reporting.\n\nNew owners ask for numbers nobody built properly before. Legacy workflows start misfiring. Marketing ops ends up rebuilding dashboards instead of running pipeline.\n\nWe rebuild HubSpot portals through that exact window. Clean ownership data, rebuild attribution, retire the workflows nobody remembers why exist.\n\nWorth a 10-min look at what usually breaks first post-buyout?",
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
````

- [ ] **Step 1: Overwrite the file with the content above**

- [ ] **Step 2: Verify line count (biggest trim — was 245)**

```bash
wc -l skills/email-gen/signals/skill.md
```
Expected: between 90 and 130 lines (signals skill has more angle-specific logic, slightly longer than others).

- [ ] **Step 3: Verify frontmatter + Critical Rules**

```bash
python3 -c "
import yaml
with open('skills/email-gen/signals/skill.md') as f:
    content = f.read()
fm = content.split('---')[1]
data = yaml.safe_load(fm)
assert len(data.get('context', [])) == 3
print('OK')
"
awk '/^## Critical Rules/,/^## /' skills/email-gen/signals/skill.md | grep -c '^- '
```
Expected: `OK`, then a number between 5 and 7.

- [ ] **Step 4: Commit**

```bash
git add skills/email-gen/signals/skill.md
git commit -m "refactor(skills): rewrite email-gen/signals to v2 template

245 → ~120 lines. Strips voice/tone/anti-pattern duplication.
Keeps the signal selection logic + signal-type → buying-moment
table since those are genuinely angle-specific."
```

---

## Task 7: Rewrite `skills/email-gen/fivefox-funded-loan-gap/skill.md`

**Files:**
- Rewrite: `skills/email-gen/fivefox-funded-loan-gap/skill.md` (~80 lines)

**Target content:**

````markdown
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
"20-min look at where the tracking leaks". Never "book a call".

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
````

- [ ] **Step 1: Overwrite the file with the content above**

- [ ] **Step 2: Verify line count + frontmatter + critical rules**

```bash
wc -l skills/email-gen/fivefox-funded-loan-gap/skill.md
python3 -c "
import yaml
with open('skills/email-gen/fivefox-funded-loan-gap/skill.md') as f:
    content = f.read()
fm = content.split('---')[1]
data = yaml.safe_load(fm)
assert len(data.get('context', [])) == 3
print('OK')
"
awk '/^## Critical Rules/,/^## /' skills/email-gen/fivefox-funded-loan-gap/skill.md | grep -c '^- '
```
Expected: line count 70-110; `OK`; critical rules 5-7.

- [ ] **Step 3: Commit**

```bash
git add skills/email-gen/fivefox-funded-loan-gap/skill.md
git commit -m "refactor(skills): rewrite email-gen/fivefox-funded-loan-gap to v2 template"
```

---

## Task 8: Grep + fix stale `josh-braun-pvc.md` refs

**Files:**
- Verify + modify (if any): anywhere that references `josh-braun-pvc.md`

- [ ] **Step 1: Grep for stale refs across the whole repo**

```bash
cd /Users/filipkostkiewicz/projects/clay-webhook-os
grep -rn "josh-braun-pvc" --include="*.md" --include="*.py" --include="*.ts" --include="*.tsx" .
```

- [ ] **Step 2: If matches found, replace each with `pvc.md`**

For each match: update the reference to `pvc.md`. Most likely locations:
- skill.md files (should already be updated in Tasks 4-7 — this is a safety net)
- Python code (unlikely but possible — check `app/core/context_assembler.py`, `app/core/skill_loader.py`)
- Documentation

- [ ] **Step 3: Verify grep now returns zero hits**

```bash
grep -rn "josh-braun-pvc" --include="*.md" --include="*.py" --include="*.ts" --include="*.tsx" . | grep -v '\.git/'
```
Expected: empty output.

- [ ] **Step 4: Commit (only if step 2 made changes)**

```bash
git status --short
git add -u
git commit -m "chore: update stale josh-braun-pvc.md refs to pvc.md"
```

---

## Task 9: Run full acceptance criteria checks

**Files:**
- Read-only verification across all affected files

- [ ] **Step 1: No legacy section refs in any skill**

```bash
cd /Users/filipkostkiewicz/projects/clay-webhook-os
grep -rn "campaign_angles\|signal_playbook\|Personas\b\|Battle Cards" skills/email-gen/ || echo "CLEAN"
```
Expected: `CLEAN`

- [ ] **Step 2: No anti-patterns sections in framework files**

```bash
grep -rn "Anti-Patterns\|patterns to avoid\|Key Principles" knowledge_base/frameworks/ || echo "CLEAN"
```
Expected: `CLEAN`

- [ ] **Step 3: Writing-style has 12 sections**

```bash
grep -c "^## " knowledge_base/_defaults/writing-style.md
```
Expected: `12`

- [ ] **Step 4: All 4 angle skills under 130 lines**

```bash
for f in skills/email-gen/new-hire/skill.md skills/email-gen/funding-round/skill.md skills/email-gen/signals/skill.md skills/email-gen/fivefox-funded-loan-gap/skill.md; do
  lines=$(wc -l < "$f")
  echo "$f: $lines"
  [ "$lines" -le 130 ] || { echo "FAIL: $f is $lines lines (max 130)"; exit 1; }
done
echo "ALL UNDER 130 LINES"
```
Expected: `ALL UNDER 130 LINES`

- [ ] **Step 5: All 4 angle skills have exactly 3 context refs**

```bash
for f in skills/email-gen/new-hire/skill.md skills/email-gen/funding-round/skill.md skills/email-gen/signals/skill.md skills/email-gen/fivefox-funded-loan-gap/skill.md; do
  count=$(python3 -c "
import yaml
with open('$f') as fh:
    fm = fh.read().split('---')[1]
print(len(yaml.safe_load(fm).get('context', [])))
")
  echo "$f: $count refs"
  [ "$count" = "3" ] || { echo "FAIL: $f has $count context refs (expected 3)"; exit 1; }
done
echo "ALL HAVE 3 CONTEXT REFS"
```
Expected: `ALL HAVE 3 CONTEXT REFS`

- [ ] **Step 6: All 4 angle skills have Critical Rules block with 5-7 bullets**

```bash
for f in skills/email-gen/new-hire/skill.md skills/email-gen/funding-round/skill.md skills/email-gen/signals/skill.md skills/email-gen/fivefox-funded-loan-gap/skill.md; do
  count=$(awk '/^## Critical Rules/,/^## /' "$f" | grep -c '^- ')
  echo "$f: $count critical rules"
  [ "$count" -ge 5 ] && [ "$count" -le 7 ] || { echo "FAIL: $f has $count (want 5-7)"; exit 1; }
done
echo "ALL HAVE 5-7 CRITICAL RULES"
```
Expected: `ALL HAVE 5-7 CRITICAL RULES`

- [ ] **Step 7: Python syntax check on any touched Python files**

```bash
python3 -m py_compile app/core/skill_loader.py app/core/context_assembler.py app/core/context_filter.py
echo "PYTHON SYNTAX OK"
```
Expected: `PYTHON SYNTAX OK`

---

## Task 10: Deploy to VPS + smoke-test all 4 angle skills

**Files:**
- Deploy: push to filipk007/reve-os, pull on VPS, restart backend

- [ ] **Step 1: Push to fork**

```bash
cd /Users/filipkostkiewicz/projects/clay-webhook-os
git push filipk main
```
Expected: successful push with new commits.

- [ ] **Step 2: Pull on VPS and restart backend**

```bash
ssh -i ~/Downloads/8cpu.pem ubuntu@34.204.7.200 "cd /opt/clay-webhook-os && git pull filipk main 2>&1 | tail -3 && sudo systemctl restart clay-webhook-os && sleep 3 && sudo systemctl is-active clay-webhook-os"
```
Expected: `active` at the end.

- [ ] **Step 3: Verify /skills endpoint returns all 4 nested angle skills**

```bash
API_KEY="rh07nO5XDxz0-yIoaJuO74tlJ9InY55q0BlUGPpit4c"
curl -s "https://clay.revenueable.com/skills" -H "x-api-key: $API_KEY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
skills = [s for s in d.get('skills', []) if s.startswith('email-gen/')]
print('email-gen skills found:', sorted(skills))
expected = {'email-gen/new-hire', 'email-gen/funding-round', 'email-gen/signals', 'email-gen/fivefox-funded-loan-gap'}
assert expected.issubset(set(skills)), f'Missing: {expected - set(skills)}'
print('ALL 4 SKILLS REGISTERED')
"
```
Expected: `ALL 4 SKILLS REGISTERED`

- [ ] **Step 4: Smoke-test `email-gen/new-hire`**

```bash
curl -s -X POST "https://clay.revenueable.com/webhook" \
  -H "x-api-key: $API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "skill": "email-gen/new-hire",
    "data": {
      "client_slug": "ubx",
      "first_name": "Sarah",
      "company_name": "TestCo",
      "title": "Head of Marketing",
      "signals": ["new_hire_lt_90d"]
    }
  }' | python3 -c "
import json, sys
d = json.load(sys.stdin)
result = d.get('result', {})
assert 'email_subject' in result, f'Missing email_subject: {d}'
assert 'email_body' in result, f'Missing email_body: {d}'
body = result['email_body']
assert not body.lower().startswith('saw '), f'Opens with saw: {body[:50]!r}'
assert not body.lower().startswith('noticed'), f'Opens with noticed: {body[:50]!r}'
assert 'most' not in body.lower() or 'we see' not in body.lower(), f'Contains vendor-speak: {body[:200]!r}'
assert 'jump on a' not in body.lower(), f'Contains banned CTA: {body[:200]!r}'
print('new-hire: OK')
print('subject:', result['email_subject'])
print('confidence:', result.get('confidence_score'))
"
```
Expected: `new-hire: OK` + a sane subject + confidence score printed.

- [ ] **Step 5: Smoke-test `email-gen/funding-round`**

```bash
curl -s -X POST "https://clay.revenueable.com/webhook" \
  -H "x-api-key: $API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "skill": "email-gen/funding-round",
    "data": {
      "client_slug": "fivefox-fintech",
      "first_name": "Priya",
      "company_name": "Nova Biotech",
      "title": "VP Growth",
      "signals": ["funding_round_lt_180d"]
    }
  }' | python3 -c "
import json, sys
d = json.load(sys.stdin)
result = d.get('result', {})
assert 'email_body' in result
body = result['email_body']
assert not body.lower().startswith('saw '), f'Opens with saw: {body[:50]!r}'
assert 'jump on a' not in body.lower()
print('funding-round: OK')
"
```
Expected: `funding-round: OK`

- [ ] **Step 6: Smoke-test `email-gen/signals`**

```bash
curl -s -X POST "https://clay.revenueable.com/webhook" \
  -H "x-api-key: $API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "skill": "email-gen/signals",
    "data": {
      "client_slug": "crm-magnetics",
      "first_name": "Mark",
      "company_name": "Kee Safety Group",
      "title": "Head of Marketing Operations",
      "signals": [
        {"date":"2026-01","headline":"Management Buyout of Kee Safety Group Ltd Supported by Intermediate Capital Group","summary":"MBO backed by ICG","trigger":"rapid_growth","type":"acquisition"}
      ]
    }
  }' | python3 -c "
import json, sys
d = json.load(sys.stdin)
result = d.get('result', {})
assert 'email_body' in result
assert result.get('signal_selected', {}).get('headline'), 'Missing signal_selected'
body = result['email_body']
assert not body.lower().startswith('saw '), f'Opens with saw: {body[:50]!r}'
print('signals: OK')
print('selected:', result['signal_selected']['headline'][:60])
"
```
Expected: `signals: OK` + the selected signal headline.

- [ ] **Step 7: Smoke-test `email-gen/fivefox-funded-loan-gap`**

```bash
curl -s -X POST "https://clay.revenueable.com/webhook" \
  -H "x-api-key: $API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "skill": "email-gen/fivefox-funded-loan-gap",
    "data": {
      "client_slug": "fivefox-fintech",
      "first_name": "Emma",
      "company_name": "LendCo",
      "title": "Head of Growth"
    }
  }' | python3 -c "
import json, sys
d = json.load(sys.stdin)
result = d.get('result', {})
assert 'email_body' in result
body = result['email_body']
assert not body.lower().startswith('saw '), f'Opens with saw: {body[:50]!r}'
# Must reference a specific proof number
assert any(n in body for n in ['3.4', '42%', '2.7', '3x', '4x']), f'No proof number in body: {body[:300]!r}'
print('fivefox-funded-loan-gap: OK')
"
```
Expected: `fivefox-funded-loan-gap: OK`

- [ ] **Step 8: If all smoke tests passed, final commit is already pushed. Tag the release:**

```bash
cd /Users/filipkostkiewicz/projects/clay-webhook-os
git tag -a context-layer-v2 -m "Context layer v2: 3-layer architecture (frameworks / writing-style / skill) with zero overlap. All 4 angle skills migrated."
git push filipk context-layer-v2
```

---

## Rollback Plan

If smoke tests fail or email quality regresses badly:

```bash
# On VPS
ssh -i ~/Downloads/8cpu.pem ubuntu@34.204.7.200
cd /opt/clay-webhook-os
git log --oneline -20  # find commit before Task 1
git reset --hard <pre-task-1-commit-sha>
sudo systemctl restart clay-webhook-os
```

All content is tracked in git; no data files involved. Fully reversible.

---

## Post-Implementation Notes (for follow-up work, not this plan)

- **Market Feedback size cap** — still deferred. Flag in commit `d7fe2c6`.
- **$1M MESSAGES templates library** — create `knowledge_base/templates/` with opt-in refs. Separate project.
- **Autoresearch loop** — design a rubric + eval-set freeze + experiment runner. Separate spec.
- **Dashboard skill editor** — currently supports nested paths after commit `92e8690` but doesn't visually group angle skills under "email-gen". Nice-to-have.
