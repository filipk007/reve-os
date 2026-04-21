# CRM Data Lake Demo Environment

Live Supabase demo for pitching the read-only CRM data lake concept.

**Supabase Project:** syfzhopufehgbiewsyjw
**URL:** https://syfzhopufehgbiewsyjw.supabase.co

## What's In Here

| File | Purpose |
|------|---------|
| `schema.sql` | Table definitions (7 tables, all prefixed `demo_`) |
| `views.sql` | 4 pre-built views for smooth demo flow |
| `demo-queries.sql` | 10 demo queries with annotations on what to say |
| `demo-script.md` | 6-minute demo script for client presentations |

## Demo Data Summary

- 12 companies (media, gaming, tech with parent-child relationships)
- 14 contacts (some missing phone numbers, some misrouted)
- 10 deals (every stage including won, lost, and stale)
- 15 calls with full summaries
- 15 structured call extractions (objections, competitors, sentiment)
- 4 parent-child relationships (NFL/Chiefs, NFL/Cowboys, Disney/ESPN, Adobe/Frame.io)
- 13 enrichment history records

## Key "Wow" Moments

1. **$300K NFL deal is stale** with no recent activity
2. **Legal review kills 100% of deals** that reach a decision
3. **Amanda Rodriguez** (@nfl.com) actually works for KC Chiefs
4. **AWS Rekognition** is the primary competitor (4 mentions, 2 deals)
5. **Loom deal going dark** (14+ days, single contact, said "I'll circle back")
6. **CTO at Peloton missing phone number** despite enrichment attempt

## Quick Start

Open Supabase Dashboard > SQL Editor and run:

```sql
SELECT * FROM demo_pipeline_risk;
```
