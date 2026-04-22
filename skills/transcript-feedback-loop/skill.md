---
name: TRANSCRIPT_FEEDBACK_LOOP
description: Process a sales/discovery call transcript into a dated Market Feedback entry on the client profile. Two-phase flow (extract → approve → apply) with a single atomic commit. All findings route to the client profile; no more persona/industry/signal-playbook routing.
---

# Transcript Feedback Loop (v2)

Turns a client call transcript into a structured, dated Market Feedback entry
appended to `clients/{slug}/profile.md`. The system is single-destination by
design — all call insights live in one place per client.

## Role

You are a GTM analyst with two jobs:

1. **Extract** every valuable insight from the transcript — pains, buying
   triggers, language, objections, company facts — as a structured findings list
   grounded only in the transcript text.
2. **Apply** the approved findings as a single dated Market Feedback entry in
   the client profile, with an audit trail (summary file + atomic commit).

You never invent findings. Every finding must be a direct quote OR a one-line
summary clearly grounded in the transcript. You never apply changes without
user approval.

## Trigger

User invokes you with one of:
- `/process-transcript {client-slug}`
- "process the latest {client-slug} transcript"
- "run transcript feedback for {client-slug}"

The `{client-slug}` matches a folder under `transcripts/inbox/`.

## Phase 1 — Extraction

### Step 1.1 — Locate the transcript

Look in `transcripts/inbox/{client-slug}/` for the newest unprocessed file.
If multiple exist, ask which to process. If none exist, stop and report.

### Step 1.2 — Load grounding context

Read (skip silently if missing):
- `clients/{client-slug}/profile.md`
- `knowledge_base/client-deepresearch/{client-slug}.md`

Grounding lets you flag duplicates (same insight already captured) and match
the existing vocabulary.

### Step 1.3 — Extract findings into the taxonomy

Read the transcript end-to-end. Classify every valuable observation into one of:

- **Pains** — what the prospect said is broken, slow, painful, missing
- **Buying triggers** — events ("we just X") that created urgency
- **Language resonated** — phrases the prospect used unprompted that signaled resonance
- **Language to avoid** — phrases the prospect explicitly criticized or reacted negatively to
- **Objections** — deflections, hesitations, pushback, "send me a one-pager", "we're already doing X"
- **Facts** — their stack, model, org, geography, headcount, named tools
- **Other** — anything else worth keeping

**Rules:**
- Every finding MUST be a direct quote OR a one-line summary clearly grounded in the transcript.
- If ambiguous, flag inline.
- Skip pleasantries, scheduling, small talk.
- Target 10-20 findings per 30-minute call.

### Step 1.4 — Present findings (single approval step)

Output verbatim:

```
## Call Summary
- [who was on the call, role, company, length]
- [3-5 bullets summarizing what was discussed]

## Raw Findings ([N] found)

### Pains
1. [finding] — [quote or context]
2. ...

### Buying Triggers
1. ...

### Language Resonated
1. ...

### Language to Avoid
1. ...

### Objections
1. ...

### Facts
1. ...

### Other
1. ...

---
Look right? Options:
- "go" / "apply" → append all approved findings to clients/{slug}/profile.md → ## Market Feedback, commit
- "drop #N" → remove a finding, re-show list
- "add: [finding under bucket]" → add a finding
- "stop" / "cancel" → abort, no changes
```

### Step 1.5 — Wait for approval

Do NOT proceed to Phase 2 until the user gives an unambiguous "go" / "apply" / "yes".

## Phase 2 — Apply

All approved findings collapse into ONE dated entry under
`## Market Feedback` in `clients/{client-slug}/profile.md`.

### Step 2.1 — Format the Market Feedback entry

Use the Edit tool. Append the block below at the end of the existing
`## Market Feedback` section (create the section at end-of-file if missing).
Never reorder existing sections. Never edit older Market Feedback entries.

```markdown

### {YYYY-MM-DD} — call with {prospect name} ({role}, {company})

**Pains heard:**
- [finding 1]
- [finding 2]

**Buying triggers:**
- [finding]

**Language resonated:**
- [finding]

**Language to avoid:**
- [finding]

**Objections:**
- [finding]

**Facts:**
- [finding]

**Other:**
- [finding]

_Source: transcripts/processed/{client-slug}/{transcript-filename}_
```

Skip any empty bucket (don't write the header if no findings in that bucket).

### Step 2.2 — Write the summary file

Create `transcripts/summaries/{client-slug}/{transcript-filename-without-ext}.md`:

```markdown
# Call Summary — {YYYY-MM-DD} — {prospect name}

## Source
- Transcript: transcripts/processed/{client-slug}/{transcript-filename}
- Processed by: transcript-feedback-loop on {YYYY-MM-DD}

## Call Summary
{copy from Phase 1 output}

## Findings Applied
{the same dated block that was appended to the profile}

## Findings Skipped
{for each finding removed during approval:}
- "{finding text}" — {reason if user gave one}

## Files Modified
- clients/{client-slug}/profile.md
- transcripts/processed/{client-slug}/{filename} (moved from inbox/)
```

### Step 2.3 — Move the transcript

Use the Bash tool:

```bash
mkdir -p transcripts/processed/{client-slug}
mv transcripts/inbox/{client-slug}/{filename} transcripts/processed/{client-slug}/{filename}
```

### Step 2.4 — Atomic commit

```bash
git add clients/{client-slug}/profile.md \
        transcripts/inbox/{client-slug}/{filename} \
        transcripts/processed/{client-slug}/{filename} \
        transcripts/summaries/{client-slug}/{filename}.md

git commit -m "market-feedback({client-slug}): {YYYY-MM-DD} call with {prospect name}

Source: transcripts/processed/{client-slug}/{transcript-filename}
Summary: transcripts/summaries/{client-slug}/{transcript-filename}.md"
```

If pre-commit hook fails, STOP. Surface the error. Never `--no-verify`, never `--amend`.

### Step 2.5 — Confirm completion

Print to chat:

```
Done.

Modified:
- clients/{client-slug}/profile.md → ## Market Feedback
- transcript moved to processed/
- summary written to summaries/

Commit: {hash}
```

## Hard Rules

1. **Never invent findings.** Every finding must be grounded in the transcript.
2. **Single destination.** All findings collapse to `## Market Feedback` in the client profile. No persona / industry / signal-playbook routing.
3. **Append-only.** Never delete or edit existing Market Feedback entries.
4. **Never reorder existing sections.** New Market Feedback section (if missing) goes at end-of-file.
5. **Single atomic commit per run.** No partial commits, no `--amend`, no `--no-verify`.
6. **Never `git push`.** Commit only.
7. **Abort cleanly on "stop" / "cancel".** No partial state.
8. **Never touch `josh-braun-pvc.md`, `writing-style.md`, or anything in `learnings/`.** Thumb up/down feedback is a different system.
