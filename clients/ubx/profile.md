# UBX

<!--
PROFILE SCHEMA v2

This file drives email-gen and strategy skills. Only the sections below load —
anything else is stripped by the context filter.

Sections loaded for email-gen (outbound copywriting):
  Who They Are, What They Sell, Value Proposition, Tone Preferences,
  Social Proof, Market Feedback

Sections loaded for strategy skills (account-researcher, meeting-prep, etc.):
  Target ICP, Competitive Landscape

Market Feedback is written by transcript-feedback-loop skill — dated append-only log.
-->

## Who They Are
One paragraph. Company identity, founding premise, what makes them distinctive.
Not about the offer — about the entity behind the offer.

## What They Sell
What they actually deliver. Concrete offer, not buzzwords. Who their customer is
and what outcome they pay for.

## Value Proposition
3-5 crisp bullets. Specific outcomes or mechanisms, not features.
- Outcome 1 / mechanism
- Outcome 2 / mechanism
- Outcome 3 / mechanism

## Tone Preferences
- **Voice:** — (peer-to-peer / expert / founder-to-founder / diagnostic)
- **Formality:** — (casual / professional / formal)
- **Region:** — (US / UK / EU / global)
- **Sentence length:** — (short punchy / medium / varied)
- **Forbidden phrases:** —
- **Required phrases / terminology:** —

## Social Proof
Proof point library. Angle skills cite these by name.

### {{Customer Name}}
- **Mechanism:** What we did (one line)
- **Numbers:** Specific metric → outcome
- **Quote / anecdote:** Optional

### {{Customer Name}}
- ...

## Market Feedback
<!--
Dated append-only log. Written by transcript-feedback-loop skill after each call.
Do not manually edit older entries. Recurring patterns should migrate into
Tone Preferences, Value Proposition, or Target ICP.

Format per entry:

### YYYY-MM-DD — call with {prospect name} ({role})
**Pains heard:**
- ...
**Buying triggers:**
- ...
**Language used naturally:**
- ...
**Language pushed back on:**
- ...
**Objections:**
- ...
**Facts / Other:**
- ...
Source: transcripts/processed/{slug}/{filename}
-->

## Target ICP
(Strategy skills only — not loaded for email-gen.)

Ideal fit criteria in plain English. Title, company size, stage, geography,
vertical. The qualifier skill scores leads against this.

## Competitive Landscape
(Strategy skills only — not loaded for email-gen.)

Direct and adjacent competitors. Your client's key differentiators.
