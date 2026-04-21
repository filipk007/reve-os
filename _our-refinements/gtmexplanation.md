# Clay Webhook OS — What Changed in 10 Days

## The Big Picture Shift

Your teammate basically rebuilt the product from "webhook server that generates emails" into a **full enrichment platform that competes with Clay**. Three major moves:

---

## 1. Tables = Your New Spreadsheet Engine

Think of it like Clay's grid. You upload a CSV of companies, add columns that do things (find emails, research companies, score leads), hit Run, and watch cells fill in real-time.

**How it works:**
- Each **column** is an action — "find email", "enrich company", "AI score this lead"
- Columns can depend on each other — email finder runs AFTER company enrichment, because it needs the domain
- The system figures out the right order automatically (DAG = dependency graph, it sorts itself)
- You see live progress — cells go from empty → spinning → filled, just like Clay

**Column types that matter to you:**
- **Enrichment** — hits a real API (Apollo, Hunter, etc.)
- **AI** — sends to Claude with a prompt you write
- **Formula** — combines other columns (`{{first_name}} {{last_name}}`)
- **Gate** — filters rows ("only continue if employee_count > 50")
- **Waterfall** — tries Provider A, if empty tries Provider B, then C
- **HTTP** — hits any API endpoint you want

---

## 2. Deepline = 865 Real API Tools

Before: the tool catalog was mostly fake — 26 providers but almost all just fell back to "ask Claude to web search." Now it actually calls real APIs.

**What this means:**
- Apollo people search → real Apollo API, ~2 seconds, structured data back
- Hunter email finder → real Hunter API
- ~865 tools total via this Deepline CLI wrapper
- If an API tool fails → falls back to Claude (slower but works)
- Results are **cached in Supabase** (7-14 days) so you don't pay twice for the same lookup

**Speed difference:** Real API = 1-3 sec/row. Claude fallback = ~35 sec/row. Massive.

---

## 3. Local-First Execution = Each Rep Runs Their Own Stack

This is the scaling model. Instead of one VPS running Claude for everyone:

- Each sales rep installs the app on their Mac
- They use **their own Claude Max subscription** ($200/mo) as compute
- The VPS just coordinates — stores data, assembles prompts, serves the dashboard
- A background daemon (`clay-run`) on their Mac polls for jobs and runs them locally

**Why it matters:** No shared API costs. No rate limits hitting everyone. Each rep's $200/mo Max sub is their personal compute budget. You onboard someone by running one setup script.

---

## 4. Context Rack = Smarter Prompt Assembly

Previously: one big function (`build_prompt()`) that jammed everything together — skill instructions, client profile, knowledge base files, learnings, etc.

Now: a **10-slot pipeline** where each slot is independent:

```
System instructions → Skill body → Memory → Learnings → Defaults 
→ Knowledge files → Semantic search → Data payload → Campaign notes → Reminder
```

**Why you care:**
- You can **turn slots on/off** per use case (skip semantic search for simple lookups = faster + cheaper)
- Each slot can pull from files OR Supabase (flip a switch per slot)
- There's analytics on what context loads into which skills and how many tokens it costs
- It's the foundation for letting you tune prompt quality without touching code

---

## 5. Sales Rep Product Surfaces

New dashboard pages built for non-dev users:

- **`/enrich`** — drag-drop a CSV, pick recipes (Find Emails, Research Companies, Score Leads), map columns, hit Run. One-click enrichment wizard.
- **`/research`** — type a company name, get an instant dossier (fires 4 skills in parallel, caches results)
- **`/prep`** — enter company + contact before a meeting, get a 6-section intelligence brief
- **`/setup`** — onboarding page for installing the local daemon (3 steps, non-technical)
- **Rep mode vs Power mode** — sidebar toggle. Reps see 4 items (Home, Enrich, Chat, Outbound). Power users see 9+ items.

---

## 6. Supabase — Yes, You Need to Connect Yours

Right now Supabase is **off by default**. Everything works with local files. But to unlock:

- **Enrichment caching** (don't pay for the same Apollo lookup twice) → needs `enrichment_cache` table
- **Context Rack database mode** (edit knowledge base from dashboard, not just markdown files) → needs `context_items` table
- **Analytics** (which skills cost how much, what context loads where) → needs `context_load_log`, `skill_executions`, `api_call_log`
- **Multi-tenant auth** (multiple users, roles, API key management) → needs `profiles`, `organizations`, `api_keys`

**To connect:**
1. Create a Supabase project
2. Run the two migration files (`001_initial_schema.sql` + `002_context_rack.sql`)
3. Add credentials to `.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Flip feature flags: `SUPABASE_CACHE_ENABLED=true`

The migrations create ~15 tables covering caching, analytics, auth, entity graphs, context management, and quota tracking. Everything has RLS policies for multi-tenant security.

---

## What's Still Ours (Not Lost)

Our portal/transcripts/branding work is saved locally in `_our-refinements/`. The two critical fixes (share link URL + comment bug) are already deployed to VPS. When you're ready to bring back transcripts, Drive integration, and branding renames, the spec + patch are there.
