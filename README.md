# Clay Webhook OS — Revenueable Fork

This is the Revenueable deployment of [ferm-the-kiln/clay-webhook-os](https://github.com/ferm-the-kiln/clay-webhook-os) — a context-heavy intelligence layer for sales teams that spawns `claude --print` subprocesses using a Claude Code Max subscription (no API key, flat-rate at scale).

> **Original project context**: see `CLAUDE.md` for the upstream architecture, conventions, and reference docs. This README documents **our specific deployment, customizations, and roadmap**.

---

## What it does

Receives row-level data from Clay (or any HTTP source), loads a skill markdown file + knowledge base + per-client profile, assembles a 6-layer prompt, runs `claude --print`, and returns structured JSON. Used for cold email generation, quality gating, account research, and other sales automations.

```
Clay row  ──▶  POST /webhook  ──▶  load skill + KB + client profile
                                          │
                                          ▼
                                  build prompt (6 layers)
                                          │
                                          ▼
                                  claude --print (sonnet)
                                          │
                                          ▼
                                  parse JSON ──▶ return to Clay
```

Per-call cost: $0 (Claude Max flat rate). Per-call latency: ~30s (sonnet thinking time). Throughput: 10 parallel workers.

---

## Deployment

| Resource | Value |
|----------|-------|
| **VPS** | AWS EC2, 8 vCPU, IP `34.204.7.200` (changes on restart — needs Elastic IP) |
| **Backend domain** | `https://clay.revenueable.com` (port 8001 internal) |
| **Dashboard domain** | `https://app.revenueable.com` (port 3000 internal) |
| **Backend service** | `clay-webhook-os.service` (systemd, runs as `ubuntu`) |
| **Dashboard service** | `clay-dashboard.service` (systemd) |
| **SSL** | Let's Encrypt via certbot (auto-renew) |
| **SSH** | `ssh -i ~/Downloads/8cpu.pem ubuntu@34.204.7.200` |
| **Code path** | `/opt/clay-webhook-os/` |
| **Repo** | Tracks `ferm-the-kiln/clay-webhook-os` upstream, with local cherry-picks |
| **Worker count** | 10 (`MAX_WORKERS=10`) |
| **Default model** | `sonnet` |
| **Subscription** | Claude Max (auth credentials extracted from Mac keychain → `~/.claude/.credentials.json` on VPS) |

### Local daemon (Mac)

A LaunchAgent `com.clay-webhook-os.clay-run.plist` runs `clay-run.py --daemon`, polling the server for jobs and executing them on the local Mac with the user's own Claude Max subscription. Config at `~/.clay-run.json`. Logs at `~/Library/Logs/clay-run.log`.

This mirrors the upstream "local-first execution" direction — each rep runs jobs against their own Claude account, falling back to VPS only when needed.

---

## Customizations on top of upstream

These changes are **not committed upstream** and must be re-applied after major pulls:

### Backend

- **`app/config.py`** — added `app.revenueable.com` to `allowed_origins` (CORS)
- **`app/core/context_filter.py`** — `SKILL_CLIENT_SECTIONS` extended:
  - `email-gen` loads: `What They Sell`, `Tone Preferences`, `Campaign Angles Worth Testing`, `Campaign Angles`, `Recent News & Signals`
  - `account-researcher` (now removed) had `Campaign Angles` added
- **`app/core/context_store.py`** — fixed slugify regex to preserve leading `_` so `_defaults` folder name doesn't become `defaults`
- **`.env`** — `WEBHOOK_API_KEY=rh07nO5XDxz0-yIoaJuO74tlJ9InY55q0BlUGPpit4c`, `MAX_WORKERS=10`, `DEFAULT_MODEL=sonnet`

### Skills (frontmatter changes for token optimization)

- **`skills/email-gen/skill.md`**:
  - `model_tier: light`, `semantic_context: false`, `skip_defaults: true`
  - Context refs trimmed to: `josh-braun-pvc.md`, `writing-style.md`, `clients/{{client_slug}}.md`
  - Removed `signal-openers.md` and persona templates from context
  - Strict rule: "Campaign Angles are ALWAYS provided in the client profile. You MUST select from them"
- **`skills/quality-gate/skill.md`**:
  - `model_tier: light`, `semantic_context: false`, `skip_defaults: true`
  - Added `clients/{{client_slug}}.md` to context refs

### Reverted upstream commits

When pulling upstream we revert these:
- `company-qualifier` skill (we use our own `supabase-mx-lookup` pipeline)
- Google OAuth login (broken on headless VPS; we use password auth)
- Domain restriction middleware (too aggressive)

### Active clients

- **`clients/fivefox-fintech/profile.md`** — Fivefox Media (fintech performance marketing) — full Sections: Company, What They Sell, Target ICP, Competitive Landscape, Recent News, Value Proposition, Tone Preferences, Qualification Criteria, Campaign Angles, Angle Selection Matrix, Personas, Battle Cards, Signal Playbook, Proven Responses, Active Campaigns
- **`clients/twelve-labs/`** — older client

### Custom additions

- `functions/company-research.yaml`, `functions/write-email.yaml`, `functions/_folders.yaml`
- `pipelines/fivefox-outbound.yaml`
- `skills/follow-up/variants/`, `skills/sequence-writer/variants/`

---

## Token optimization journey

**Problem**: Initial pipeline runs (`POST /pipeline` with email-gen → quality-gate as a chain) used ~32K tokens per call.

**Root causes**:
1. `pipeline_runner.py` does `current_data.update(step_result["output"])` between steps — so step 2 receives all of step 1's output dumped into its data
2. `semantic_context: true` (default) auto-loaded `signal-taxonomy.md`, `approval-process.md`, and duplicated client profile sections
3. `skip_defaults: false` loaded all `_defaults/*.md`
4. email-gen frontmatter had no `context:` field — so client profile didn't load AT ALL, causing Claude to invent angles

**Fixes**:
1. Switched from chained pipelines to **separate Clay HTTP Action columns** (one per skill) — eliminated cross-step bloat
2. Set `semantic_context: false`, `skip_defaults: true` in skill frontmatter
3. Added explicit `context:` refs to email-gen (incl. `clients/{{client_slug}}.md`)
4. Trimmed `SKILL_CLIENT_SECTIONS` to only the sections each skill actually needs

**Result**: Down from **32K → ~7K tokens per call**. ~30s per call is now Claude's thinking floor, not prompt assembly overhead.

---

## Critical gotchas (learned the hard way)

### `client_slug` placement
Must be **inside** the `data` object, NOT at the top level of the request body. `context_assembler.py` line 103 reads `client_slug = data.get("client_slug")`. If you put it top-level, no client profile loads and Claude invents angles.

### Skill `context:` refs MUST be in frontmatter
The `## Context Files to Load` section in the skill body is just text — the server only reads context refs from **frontmatter `context:` field**. Listing files in markdown does nothing.

### Restart kills the prompt cache
The prompt cache (`prompt_cache` in `/health`) is in-memory only. Every `systemctl restart clay-webhook-os` resets it to zero. First call after restart is cold (~30s), subsequent calls with shared prefix are faster.

### Cherry-picks overwrite CORS
Almost every upstream pull touches `app/config.py` or related files. After cherry-picking, **always re-add** `app.revenueable.com` to `allowed_origins`.

### `systemctl kill` hangs
Uvicorn graceful shutdown hangs when health-poll connections are open. Use `sudo kill -9 $(pgrep uvicorn)` instead of `systemctl kill`.

### VPS IP changes on restart
The EC2 instance gets a new public IP after every stop/start. Update DNS A records and re-run certbot. **TODO**: attach an Elastic IP.

### Cherry-picks need new dependencies
Recent upstream pulls added `aiohttp>=3.9.0` (for the bridge). After pulling, install in the venv:
```bash
/opt/clay-webhook-os/.venv/bin/pip install aiohttp
```

### `useSearchParams` Suspense bug
Upstream periodically introduces `useSearchParams()` calls in `/tables/page.tsx` without wrapping them in a `<Suspense>` boundary, breaking the build. Fix is to extract the inner component and wrap the export in `<Suspense>`. Upstream sometimes ships their own fix (e.g. `f497386`).

---

## Latest upstream features (April 2026)

### Standalone enrichment platform (commit `917b3e3`)
Adds 13 features pulled from Rowbound + Mold:

- **HTTP columns** — call any API per row, JSONPath extraction, SSRF protection
- **Waterfall columns** — try providers in order, first non-empty wins
- **Lookup columns** — cross-table joins
- **Script columns** — sandboxed Python/Bash/Node per row
- **Write columns** — push rows to another table _(backend done, no UI yet)_
- **Per-column error handling** — skip/fallback/stop with retries + backoff
- **Rate limiting** — per-column delay between requests
- **Bridge endpoint** (`POST /bridge`) — Promise Parking pattern, holds HTTP connections up to 5 minutes for sync table-to-table calls
- **Table sources** — HTTP/webhook/script data sources
- **Google Sheets sync** — bidirectional
- **Table validation** — pre-flight checks (circular deps, SSRF, config)
- **8 new MCP tools**

**Caveats we hit**:
- Several column types (HTTP, Waterfall, Lookup, Script) had backend support but the parent `tables/[id]/page.tsx` didn't pass the callback props to the palette → invisible. We patched the page to wire them up.
- **Write columns** still aren't in the UI even after that fix.
- The `/bridge` endpoint expects the target webhook to **accept and call back asynchronously**, but our `/webhook` is synchronous → returns the result directly. Bridge sits waiting for a callback that never comes. Bridge is for table-to-table calls, not for our Clay → webhook flow.

### Sales rep UX overhaul (commit `17ab61b`)
- Persona system (Sales Rep vs Builder) stored in localStorage
- Rep-mode simplified sidebar
- `MyWorkDashboard` homepage with quick actions and templates
- `ExecutionSummary` overlay with success/error/CSV-export
- Friendly terminology mapper

### Local-first execution (commit `c06f993`)
- `setup-rep.sh` — one-command Mac install (verifies Claude Max, creates venv, installs deps, sets up daemon)
- `/health` now returns `claude_user`, `daemon`, `backend_host`
- Header tooltip shows which Claude account is logged in
- Default API URL changed to `localhost:8000` (assumes local-first)

### One-click CSV enrichment wizard (commits `ee875b4` + `9eec046`)
- New `/enrich` page with 4-step wizard: upload → recipes → mapping → run
- 7 workflow templates (Find Emails, Research Companies, Score Leads, Email Waterfall, etc.)
- Smart recipe suggestions from CSV headers
- Live cell preview, quality cards, confetti, Framer Motion transitions

---

## Where this is going (the dream)

The current architecture has us splitting work across two systems:

1. **Clay** — for ICP filtering, list building, person/company enrichment via Apollo/Clearbit
2. **Webhook OS** — for AI generation (email-gen, quality-gate, etc.) called via Clay HTTP Action

This was the right call when Clay had better connectors than us. But the upstream's recent direction (HTTP columns, waterfalls, scripts, bridge, wizard) is making the Webhook OS table system **a self-contained Clay-like enrichment engine**. Every Clay primitive now has an equivalent in the table builder.

### Target state

Single end-to-end workflow inside the Webhook OS:

```
Upload CSV (200 leads from Apollo / AI Ark / etc.)
   │
   ▼
Add columns:
   ├── HTTP column → enrich domain (Apollo API)
   ├── HTTP column → find email (Findymail)
   ├── Waterfall column → email fallback (Hunter)
   ├── Lookup column → exclusion list check
   ├── AI column → company_research
   ├── Skill column → email-gen (with client_slug + skill machinery)  ← TODO
   └── Skill column → quality-gate                                      ← TODO
   │
   ▼
Click Run → 10 workers in parallel → ~3 minutes total
   │
   ▼
Download CSV ready for Smartlead
```

**What this gives us**:
- $0/month Clay credits
- No HTTP Action timeouts (everything local)
- Prompt cache stays hot the entire run (massive speedup vs. one-off webhook calls)
- Per-cell debugging in the dashboard
- Re-run individual rows or columns
- A/B test client profiles by duplicating the table
- Iterate skills and re-run just the affected column

**What we keep losing**:
- Clay's pre-built provider connectors (we'd build HTTP column templates for Apollo/Findymail/Hunter — 1-2 hours each, then reusable)
- Triggered runs on schedule (we batch-upload CSVs anyway after AI Ark / Apollo lookalike work)

### What's blocking it

The table executor's `ai` column type only runs raw AI prompts. It doesn't understand **skills**, the **knowledge base**, **client profiles**, or **context filtering**. To make the dream work we need a new column type:

**`SkillColumn`** — wraps the existing skill machinery for use inside tables

```yaml
column_type: skill
skill: email-gen
client_slug: fivefox-fintech       # set once at column level
data_mapping:
  full_name: "{{Full Name}}"
  company_name: "{{Company Name}}"
  industry: "{{Industry}}"
  business_overview: "{{Business Overview}}"
```

The executor would:
1. Load the skill from `skills/{name}/skill.md`
2. Pull in context refs (KB + client profile, filtered)
3. Map table column values into the skill's `data` payload
4. Call `claude --print` (same code path as `/webhook`)
5. Parse JSON response → write back to row cells

Each row remains an **independent `claude --print` call** — same as today's webhook flow. Why not batch via long-lived sessions?

- **Stateless = robust**. One bad row can't poison a batch.
- **Custom signals per row**. Half the prompt is row-specific, batching saves nothing.
- **Prompt caching is automatic**. The shared prefix (system + skill + KB + client.md) gets cached server-side. First call ~30s, subsequent calls ~10-15s. Free speedup.
- **Parallelism > sequencing**. 10 parallel `--print` calls beat 1 worker doing 10 sequential turns.
- **Simpler debugging**. One row = one process = one cell = one log line.

The upstream chose `claude --print` per row for the same reasons. We'll follow that pattern.

### Roadmap

**Phase 1 (immediate)** — pull the 3 latest upstream commits (`c06f993`, `ee875b4`, `9eec046`). Get the wizard live.

**Phase 2 (short)** — add `SkillColumn` type to the table executor. Wraps existing skill machinery. ~half-day of work.

**Phase 3 (medium)** — build HTTP column presets for Apollo, Findymail, Hunter, Clearbit. Each is a saved template with auth headers and JSONPath extraction. Reusable across tables.

**Phase 4 (medium)** — migrate Fivefox cold outbound to a fully table-based workflow. Run side-by-side with Clay for a few weeks. If it sticks, sunset the Clay HTTP Action setup.

**Phase 5 (long-term)** — dynamic context loading per row group (e.g. `industries/fintech.md` for fintech rows, `industries/saas.md` for saas rows) via a `group_by` column in the SkillColumn config.

### Infrastructure todos

- **Attach Elastic IP** to the VPS so the IP doesn't change on restart
- **Quality-gate audit** — currently loads `common-objections.md` which isn't relevant for email QA
- **Fivefox profile section names** — rename `Recent News` → `Recent News & Signals` to match what `context_filter.py` expects
- **Review tab** — `pipeline_runner.py` doesn't record to `usage_store`, so multi-skill webhook runs don't appear in the dashboard review queue. Only single-skill paths track usage.
- **Skill audit** — trim unnecessary context loading across all skills (quality-gate is the worst offender)

---

## Reference: how to do common things

### Pull upstream changes safely
```bash
# Local
cd ~/projects/clay-webhook-os
git fetch origin
git log --oneline ce8d252..origin/main   # see what's new

# VPS
ssh -i ~/Downloads/8cpu.pem ubuntu@34.204.7.200 "cd /opt/clay-webhook-os && git stash && git fetch origin && git cherry-pick <sha>... && git stash pop"

# Re-add CORS if config.py was touched
# Install any new venv deps (e.g. aiohttp)
# Rebuild dashboard
ssh ... "cd /opt/clay-webhook-os/dashboard && npm run build"

# Restart services
ssh ... "sudo systemctl restart clay-webhook-os clay-dashboard"
```

### Sync a Fivefox profile change
```bash
scp -i ~/Downloads/8cpu.pem \
  ~/projects/clay-webhook-os/clients/fivefox-fintech/profile.md \
  ubuntu@34.204.7.200:/opt/clay-webhook-os/clients/fivefox-fintech/profile.md

# Then restart to flush in-memory cache
ssh -i ~/Downloads/8cpu.pem ubuntu@34.204.7.200 "sudo systemctl restart clay-webhook-os"
```

### Test a webhook call from Clay
Body to `POST https://clay.revenueable.com/webhook` with header `x-api-key: <WEBHOOK_API_KEY>`:
```json
{
  "skills": ["email-gen"],
  "model": "sonnet",
  "data": {
    "client_slug": "fivefox-fintech",
    "full_name": "Julius Schmidt",
    "company_name": "fulfin",
    "domain": "fulfin.com",
    "title": "CMO",
    "employee_count": "50-200",
    "business_overview": "...",
    "business_positioning": "...",
    "ads_found": "12"
  }
}
```

### Debug a slow call
```bash
ssh -i ~/Downloads/8cpu.pem ubuntu@34.204.7.200 "curl -s http://localhost:8001/health | python3 -m json.tool"
# Check: cache_entries, prompt_cache.hit_rate, queue_pending, workers_available
# If prompt_cache.hits = 0, the cache is cold (likely from a recent restart)
```

### Force-kill stuck uvicorn
```bash
ssh -i ~/Downloads/8cpu.pem ubuntu@34.204.7.200 "sudo kill -9 \$(pgrep uvicorn) && sudo systemctl start clay-webhook-os"
```

---

## Files that document this project

- **`CLAUDE.md`** — upstream architecture, conventions, request lifecycle, prompt assembly pipeline
- **`README.md`** (this file) — Revenueable deployment, customizations, gotchas, roadmap
- **`docs/architecture.md`** — full directory tree + request flow (upstream)
- **`docs/api-reference.md`** — all API endpoints (upstream)
- **`docs/skills-guide.md`** — skill authoring guide (upstream)
- **`architecture-graph.json`** — machine-readable knowledge graph of the system
