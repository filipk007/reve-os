# Context Layer v2 — Dedupe + 3-Layer Architecture

**Date:** 2026-04-23
**Status:** Design approved, ready for implementation plan
**Scope:** Refactor what loads when an email-gen skill fires. No functional change to email output; cleaner separation of concerns so voice rules, framework methodology, and angle-specific copy live in exactly one place each.

---

## Problem

Today, when `email-gen/{angle}` fires, the Claude prompt is assembled from four context sources:

1. `knowledge_base/frameworks/josh-braun-pvc.md` — methodology + voice rules + anti-patterns + length rules
2. `knowledge_base/_defaults/writing-style.md` — voice rules + patterns to avoid + tone-by-context
3. `clients/{slug}/profile.md` — filtered to ~6 sections for email-gen
4. `skills/email-gen/{angle}/skill.md` — role + data fields + hook patterns + rules + examples + anti-patterns

Several rules appear in 3-4 places at once:
- "No jargon / buzzwords / 'I' starting / exclamation" → in PVC **and** writing-style **and** every skill
- "Short paragraphs / under N words" → in PVC **and** every skill
- Tone rules → in writing-style **and** client profile (Tone Preferences) **and** skill
- "Good / bad" opener examples → in PVC **and** skill

Consequences:
- Editing a rule requires touching 3-4 files; drift is inevitable
- Adding a new angle skill means copy-pasting ~50 lines of voice rules
- Framework swap (e.g. switching an angle from PVC to PVP) requires rewriting the skill
- User has new voice material (bestpractices.md, $1M MESSAGES theory) that overlaps existing files and has no clean home

## Goals

1. Every rule lives in exactly one file
2. Frameworks are swappable per skill (split-test PVC vs PVP without touching copy)
3. Voice/tone is a single source-of-truth loaded once per email-gen call
4. Skill files focus on angle-specific copy only; ~80 lines each
5. Critical rules (opening line, banned vendor phrases) are *reinforced* inside each skill (intentional emphasis, not duplication) so Claude weighs them at close range

## Non-Goals

- Not touching the Context Rack / skill_loader internals (they already support the new shape via `context:` frontmatter)
- Not changing client profile schema (already v2)
- Not building the autoresearch loop (deferred to a separate spec once this ships)
- Not extracting the $1M MESSAGES templates library (deferred; `knowledge_base/templates/` is a follow-on project)

---

## Architecture

Four layers, strict content separation:

```
LAYER 1 — FRAMEWORKS (swappable)
  knowledge_base/frameworks/
    pvc.md          Josh Braun Permission/Value/CTA
    pvp.md          Permissionless Value Prop (new)
  Content: methodology + psychology ONLY.
  Never contains: voice rules, forbidden phrases, copy examples
  beyond ONE good/bad per framework component.

LAYER 2 — WRITING STYLE (always loaded)
  knowledge_base/_defaults/writing-style.md
  Content: voice bible. Levers, opening-line rule,
  forbidden phrases, CTAs, subject lines, structure,
  follow-ups, personalization, self-interest check.
  ONE file, applies to every email-gen call regardless
  of framework or angle.

LAYER 3 — ANGLE SKILL (angle-specific)
  skills/email-gen/{angle}/skill.md
  Content: positioning + when-to-use + data fields +
  output format + angle-specific hooks + Critical Rules
  block (5-7 hard nos, reinforcing top rules from
  writing-style) + ONE full example.

LAYER 4 — CLIENT PROFILE (unchanged)
  clients/{slug}/profile.md
  Content: client-specific voice, proof, market feedback.
```

**Property:** zero content overlap between layers 1, 2, 3. A rule lives in exactly one file. Critical Rules blocks in layer 3 are a short emphasis layer (1-line reminders), NOT restatements of layer 2 content.

---

## Layer 1 — Frameworks

### `knowledge_base/frameworks/pvc.md`

Rename from `josh-braun-pvc.md` → `pvc.md`. Trimmed from 71 → ~35 lines.

**Keeps:**
- P/V/C component definitions
- ONE good/bad example per component (distinct from skill examples)

**Removes (moves to writing-style):**
- "Key Principles" bullets (length, subject line, buzzwords, text-from-friend)
- "Anti-Patterns" list (starting with "I", multiple CTAs, exclamation, paragraphs too long)

### `knowledge_base/frameworks/pvp.md`

New file, ~45 lines. Sourced from:
- `Desktop/RESOURCES/MDs/Video Summary - PVP.md`
- `Desktop/RESOURCES/MDs/Video Summary - Seller-Centric vs. Buyer-Centric Communication.md`

**Contains:**
- Buyer-centric vs seller-centric mindset
- ISCP (Ideal Situation Customer Profile) — situation > demographics
- Existential Data Points concept
- The PVP test: *"If I charged money for this message, would they pay?"*
- ONE case study (WingWork FAA regulation — shortest clearest example)

**Does not contain:**
- Voice/tone rules (those are in writing-style)
- Email-body copy examples beyond the case study
- Subject line rules

---

## Layer 2 — Writing Style

`knowledge_base/_defaults/writing-style.md` — full rewrite. Current 50 lines → target ~170 lines.

Sourced from:
- `copywriter/campaigns/test-campaign/bestpractices.md` (185 lines)
- `youtube transcripts/yt/$1M MESSAGES.md` → THEORY section only (the 9 levers)

**Structure (12 sections, roughly sized):**

| # | Section | ~Lines | Contains |
|---|---|---|---|
| 1 | North Star | 5 | Voice DNA — the "sharp, non-pushy founder" text posture |
| 2 | Buyer-centric mindset | 10 | Expert in their field, not yours; no product talk in email 1 |
| 3 | Nine psychological levers | 40 | Pattern interrupt, relevance, curiosity, social proof, authority, FOMO, reciprocity, ego, autonomy — ~4 lines each |
| 4 | Opening line rule | 8 | First line = preview text, looks internal; never start with saw / noticed / came across / I was looking at; the "drop-the-verb" fix with the Kee Safety example |
| 5 | Forbidden phrases (comprehensive) | 30 | Generic openers, overused adjectives, business jargon, pushy, vague claims, lazy follow-ups, "Most X we see Y", feature dumping, multi-CTA, exclamation |
| 6 | Disarming language whitelist | 15 | "Tentatively assuming", "Grain of salt", "If we entertain", "Possibly unnecessary thought" etc. |
| 7 | CTA patterns (use + never) | 10 | Self-aware closer, disarming question, no-CTA option; banned: "jump on a call", "grab 15 minutes" etc. |
| 8 | Structure rules | 8 | Sentence length, paragraph length, total word cap, mobile skim |
| 9 | Subject line rules | 10 | Threading strategy, 6-words cap, boring-on-purpose vs pattern-disruptor |
| 10 | Follow-up rules | 10 | No sequence-meta; each email standalone; new pain angle per touch |
| 11 | Personalization stacking | 8 | Layer name + time-in-role + tech stack + recent news; hedge language |
| 12 | Self-interest check | 5 | Final gate: "would I respond?" |

**Explicitly dedicates to this file (removed from all other files):**
- All "avoid" / anti-pattern lists
- All length/word-count rules
- All subject line guidance
- All follow-up framing rules
- All voice/tone defaults

---

## Layer 3 — Angle Skill Template

Every angle skill under `skills/email-gen/` conforms to this shape. Target: ~80 lines.

```markdown
---
model_tier: light
semantic_context: false
skip_defaults: true
context:
  - knowledge_base/frameworks/pvc.md    # OR pvp.md — skill picks one
  - knowledge_base/_defaults/writing-style.md
  - clients/{{client_slug}}.md
---

# Email Generator — {Angle Name}

## Angle Positioning
One paragraph: what this angle IS, what buying moment it targets.

## When to Use
Signal criteria (payload state that activates this angle).

## Data Fields
Expected payload fields for this angle.

## Output Format
JSON contract (same shape as existing skills, `angle_used` field hardcoded to the slug).

## Angle-Specific Guidance
- 3-4 hook patterns FOR THIS ANGLE ONLY
- What to cite from client's Social Proof section (for this angle)
- CTA nuance specific to this angle (NOT the generic CTA rules — those live in writing-style)

## Critical Rules (emphasis layer)
- Never open with "saw / noticed / came across / I was looking at"
- Never "Most X we see Y" style vendor-speak
- Never "jump on a quick call / grab 15 minutes / book a slot"
- {1-2 angle-specific hard nos}

## Example
ONE complete input/output.
```

**Removed from skill (relative to current):**
- Role description (voice content — in writing-style)
- General anti-patterns list (in writing-style)
- Framework explanation (in framework file)
- Jargon lists, length rules, exclamation rules (all in writing-style)
- Multiple examples (one is enough; writing-style has the principles)

**Kept in skill:**
- Everything angle-specific (positioning, signals, hook patterns, proof citation guidance, CTA nuance)
- Critical Rules block — 5-7 items. Reinforces writing-style at close attention range. Each item is a one-liner, not a paragraph.

**Critical Rules policy:** the block contains the top constraints that would silently ruin the email if violated. The universal ones are copy-pasted identically across all angle skills (opening-line rule, "Most X we see Y", "jump on a call"). The angle-specific ones (1-2 per skill) are unique.

---

## Layer 4 — Client Profile

Unchanged. Already v2 (8 sections, filtered per-skill via `SKILL_CLIENT_SECTIONS`). No migration required.

---

## Token Math

What a single `email-gen/{angle}` call loads, approximate lines:

| Layer | Before | After |
|---|---|---|
| Framework file | 71 | 35 |
| Writing-style | 50 | 170 |
| Skill | ~120 | ~80 |
| Client profile (filtered) | ~150 | ~150 |
| **Total** | **~390** | **~435** |

Net: +45 lines per call (~12% token increase). Trade-off is worth it because:
- Zero overlap — each rule appears once (not 3-4x)
- Adding a 5th angle skill doesn't duplicate 50 lines of voice rules (net savings as system grows)
- Framework swap is one-line frontmatter change, not a rewrite
- Voice improvements flow through all angles automatically
- Human maintenance cost drops sharply (edit rule in one place)

---

## Migration Plan

### Files to CREATE

```
knowledge_base/frameworks/pvp.md
  Source: Desktop/RESOURCES/MDs/Video Summary - PVP.md
        + Desktop/RESOURCES/MDs/Video Summary - Seller-Centric vs. Buyer-Centric Communication.md
  Target: ~45 lines
```

### Files to REWRITE

```
knowledge_base/frameworks/josh-braun-pvc.md  →  pvc.md
  Rename + strip. 71 → ~35 lines.

knowledge_base/_defaults/writing-style.md
  Full rewrite. 50 → ~170 lines.
  Source: bestpractices.md + $1M MESSAGES THEORY section.

skills/email-gen/new-hire/skill.md
skills/email-gen/funding-round/skill.md
skills/email-gen/signals/skill.md
skills/email-gen/fivefox-funded-loan-gap/skill.md
  All 4 angle skills move to the new ~80-line template.
  Strip voice/tone/anti-pattern duplication.
  Add Critical Rules block (5-7 hard nos).
```

### Files to UPDATE (minor)

```
Angle skill frontmatter `context:` refs:
  knowledge_base/frameworks/josh-braun-pvc.md  →  pvc.md
```

### Files to DELETE

None. All content is reorganized, not destroyed.

### Order of Operations

1. Write new `writing-style.md` (biggest payoff, unblocks skill rewrites; easiest to verify since content changes are isolated)
2. Write new `pvp.md` (isolated; no ripple effects)
3. Rename + trim `pvc.md` (rename first, then trim; skill frontmatter updates follow)
4. Rewrite the 4 angle skills against the new template (parallelizable)
5. Grep for any remaining `josh-braun-pvc.md` refs; update to `pvc.md`
6. Commit in one logical batch (all 6 files)
7. Deploy to VPS, restart services
8. Smoke-test ONE skill end-to-end (generate an email via `/webhook`); visually compare output to pre-migration baseline
9. Spot-check the other 3 angles with curl

### Safety

- Current UBX / Fivefox profiles are already v2 — untouched by this migration
- Old `skills/email-gen/skill.md` is already in `_legacy/` — no conflict
- All migrations are idempotent (rewrites, not partial edits); at no point does a skill reference a missing file
- `skill_loader.load_file()` returns None gracefully on missing refs — if a rename misses a caller, emails still generate with fewer context layers, not crash

---

## Testing

No new tests required. Existing `/evals/email-gen/golden-set.json` covers output-shape validation. Manual smoke test of one email per angle against current baseline is sufficient (visual diff — same voice, same structure, slightly different phrasing is expected and fine).

---

## Out of Scope (Future Work)

1. **Autoresearch loop** — self-improving context files via automated variant → eval → score → promote cycle. Requires: rubric design, eval-set freeze, experiment runner. Separate spec.
2. **`knowledge_base/templates/` library** — extract the $1M MESSAGES templates (POKE THE BEAR, UNHINGED, LEAD MAGNET, GENIUS OR TERRIBLE, INTERNAL NUDGE, etc.) into individual reference files that specific angle skills can opt into. Separate project.
3. **Market Feedback size cap** — auto-truncate to recent-N entries in `filter_client_profile` when the section grows past a threshold. Flagged in commit `d7fe2c6`.
4. **Dashboard skill editor UX** — the nested skill save bug (`/skills/{name:path}/content`) was fixed in commit `92e8690`; the editor now works but doesn't have special awareness of angle skills (no visual grouping under "email-gen"). Nice-to-have.

---

## Acceptance Criteria

- `grep -l 'campaign_angles\|persona\|signal_playbook' skills/email-gen/` returns empty (no legacy refs in skills)
- `grep -l 'anti-pattern\|patterns to avoid' knowledge_base/frameworks/` returns empty (anti-patterns moved out of frameworks)
- `grep -c '^## ' knowledge_base/_defaults/writing-style.md` returns 12 (twelve sections)
- Every angle skill under 100 lines
- Every angle skill has exactly three `context:` refs in frontmatter (framework + writing-style + client profile)
- Every angle skill has a `## Critical Rules` section with between 5 and 7 bullets
- Smoke-test curl to `/webhook` with `skill=email-gen/new-hire` + a real UBX payload returns valid email JSON
- Voice of generated emails unchanged vs. pre-migration (no regressions; improvements acceptable)
