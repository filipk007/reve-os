# 6-Minute Demo Script

## Setup

Open Supabase Dashboard > SQL Editor. Have queries ready to paste.

## Minute 1: Pipeline Risk

**Say:** "Here's your entire pipeline with risk signals, pulling from CRM data, call history, and contact associations in one query."

```sql
SELECT deal_name, amount, stage, rep, company_name,
       contacts_engaged, threading_status, activity_status
FROM demo_pipeline_risk;
```

**Point out:**
- "$300K NFL deal is stale. That's your biggest deal and it hasn't been touched in 2 weeks."
- "ESPN is single-threaded AND stale. Only one contact. Double risk."
- "Dallas Cowboys and KC Chiefs have zero contacts. How do you have a deal with nobody on it?"
- "Warner Bros looks healthy. Multi-threaded, active, 3 contacts engaged."

**Key line:** "This took 3 milliseconds. Getting this view from HubSpot would take 30 minutes of clicking through individual deals."

## Minute 2: Parent-Child Detection

**Say:** "Now watch this. We check if any contacts are misrouted because of parent-child company relationships."

```sql
SELECT
  c.first_name || ' ' || c.last_name as contact,
  c.email, c.title,
  c.company_name as hubspot_says,
  ch.child_name as actually_works_at,
  d.deal_name as should_be_on_deal
FROM demo_contacts c
JOIN demo_company_hierarchy ch ON ch.parent_domain = split_part(c.email, '@', 2)
LEFT JOIN demo_deals d ON d.company_domain = ch.child_domain
WHERE c.title ILIKE '%' || ch.child_name || '%'
  OR c.title ILIKE '%' || split_part(ch.child_name, ' ', 1) || '%';
```

**Point out:**
- "Amanda Rodriguez has an @nfl.com email, so HubSpot puts her under NFL. But her title says Kansas City Chiefs. She should be on the KC Chiefs deal."
- "Same with Carlos Reyes. @nfl.com email, but works for Dallas Cowboys."
- "Without this catch, the wrong rep works the wrong contact. Deals get confused."

**Key line:** "This detection runs automatically from data you already have. No manual review needed."

## Minute 3: Objection Analysis

**Say:** "Every call gets analyzed for objections. After enough calls, patterns emerge."

```sql
SELECT * FROM demo_objection_analysis;
```

**Point out:**
- "Legal review came up 3 times. Every time it reached a decision, the deal was lost. 100% kill rate."
- "That's not a report someone built. That's a pattern the system found by connecting call transcripts to deal outcomes."

**Key line:** "You now know you need a legal playbook. And you know because the data told you, not because someone guessed."

## Minute 4: Competitive Intelligence

**Say:** "Same idea with competitors. Who keeps coming up and how do we perform against them?"

```sql
SELECT * FROM demo_competitive_landscape;
```

**Point out:**
- "AWS Rekognition is in 4 conversations across Warner Bros and ESPN. That's your primary competitor right now."
- "Clarifai is the only one you've actually lost to."
- "This updates automatically with every new call. No annual competitive analysis needed."

## Minute 5: Call Quotes

**Say:** "And here's the qualitative gold. What are prospects actually saying in their own words?"

```sql
SELECT calls.company_name, ce.call_type, ce.sentiment,
       unnest(ce.key_quotes) as prospect_quote
FROM demo_call_extractions ce
JOIN demo_calls calls ON calls.id = ce.call_id
ORDER BY calls.call_date DESC;
```

**Point out:** Read 2-3 powerful quotes. These are the voice of the customer, captured automatically.

## Minute 6: The Wrap

**Say:**
- "Everything you just saw came from data your team is already generating. Calls, CRM updates, enrichment results."
- "Supabase is a read-only mirror. It can't touch HubSpot. Zero risk to your CRM."
- "This took a week to build. It costs $25 a month. And it gets smarter with every call your team makes."
- "After 100 calls, you don't have 100 summaries. You have a data-driven playbook."

## If They Ask

**"Can we see this as a dashboard?"**
> "Yes, we build dashboard views on top of these same queries. But the power isn't the charts. It's that you can ask any question and get an answer in milliseconds."

**"What about security? Is our data safe?"**
> "Supabase is SOC2 compliant, encrypted at rest, and we use row-level security. Your data never leaves Supabase's US servers."

**"How long to set up with our data?"**
> "About a week. Day 1 we mirror your CRM. Day 2 we connect Fathom. Day 3 we start seeing insights. By week 2 you have a daily intelligence digest in Slack."

**"What does it cost?"**
> "$25/month for Supabase. The rest is code we build and you own. No recurring vendor fees beyond that."
