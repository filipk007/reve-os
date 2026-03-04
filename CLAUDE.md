# Clay Webhook OS — Setup & Architecture Guide

A webhook server that turns Clay HTTP Actions into AI-powered skills using
your Claude Code Max subscription. No API key needed.

## How It Works

```
Clay Row → POST /webhook → Load Skill + Context → claude --print → JSON → Clay
```

The server spawns `claude --print` as a subprocess for each request, using your
logged-in Claude Code Max subscription. No Anthropic API key required.

## Architecture

```
clay-webhook-os/
├── index.js                    # Express server + claude CLI wrapper
├── skills/                     # Skill definitions (prompts + rules + output format)
│   └── [name]/skill.md
├── knowledge_base/             # Reusable knowledge injected into prompts
│   ├── frameworks/             # Methodologies (PVC, MEDDIC, etc.)
│   ├── voice/                  # Writing style guides
│   └── industries/             # Industry-specific context (auto-loaded by data.industry)
├── clients/                    # Per-client context (loaded via {{client_slug}})
├── 00_foundation/              # Positioning & messaging docs
├── _system/knowledge_graph/    # Taxonomy + ontology
├── .replit                     # Replit run/deploy config
└── replit.nix                  # Nix environment (Node.js 20)
```

## Replit + Claude Code Setup (One-Time)

### 1. Create Replit project
- Create a new Node.js Repl on replit.com
- Upload all project files (index.js, package.json, .replit, replit.nix, skills/, knowledge_base/, clients/)

### 2. Install Claude Code on Replit
In Replit's Shell tab:
```bash
npm install @anthropic-ai/claude-code
```

### 3. Log in to Claude Code
```bash
./node_modules/.bin/claude login
```
Follow the prompts to authenticate with your Claude Max subscription.

### 4. Verify it works
```bash
./node_modules/.bin/claude --print "say hello"
```
You should get a response like "Hello! How can I help you today?"

### 5. Start the server
```bash
pkill -f node; sleep 1; PATH="./node_modules/.bin:$PATH" node index.js
```
You should see:
```
clay-webhook-os listening on 0.0.0.0:3000
Skills available: email-gen
WEBHOOK_API_KEY: disabled
```

### 6. Get your dev URL
In a second Shell tab:
```bash
echo $REPLIT_DEV_DOMAIN
```
Your webhook URL is: `https://<that-domain>/webhook`

## Clay HTTP Action Setup

### Headers
| Key | Value |
|-----|-------|
| Content-Type | application/json |
| X-API-Key | *(optional — only if WEBHOOK_API_KEY is set on Replit)* |

### Body (JSON)
```json
{
  "skill": "email-gen",
  "data": {
    "first_name": "/First Name",
    "company_name": "/Company Name",
    "title": "/Title",
    "industry": "/Industry",
    "signal_detail": "/Signal Details",
    "client_slug": "twelve-labs"
  },
  "instructions": "",
  "model": "haiku"
}
```

Map Clay column values using the `/Column Name` syntax in the body fields.

### Settings
- **Method:** POST
- **Timeout:** 100000 ms (Claude CLI can take 30-60 seconds)
- **URL:** `https://<your-replit-dev-domain>/webhook`

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| GET | `/skills` | List available skills |
| POST | `/test-echo` | Echo back the request body (debugging) |
| POST | `/webhook` | Main endpoint — runs a skill with data |

## Models

Pass `"model"` in the webhook body to select which Claude model to use:

| Value | Model | Best For |
|-------|-------|----------|
| `haiku` | Claude Haiku (default) | Fast, cheap — good for most skills |
| `sonnet` | Claude Sonnet | Better quality, still fast enough for Clay |
| `opus` | Claude Opus | Best quality — may exceed Clay's timeout |

## Adding a New Skill

1. Create `skills/[name]/skill.md`
2. Define sections:
   - **Role** — who the AI acts as
   - **Context Files to Load** — knowledge_base/ and clients/ refs
   - **Output Format** — exact JSON keys to return
   - **Rules** — constraints and guidelines
   - **Examples** — input/output pairs
3. Test with curl:
```bash
curl -X POST "https://<your-domain>/webhook" \
  -H "Content-Type: application/json" \
  -d '{"skill":"your-skill","data":{"first_name":"Test","company_name":"Acme"}}'
```
4. Connect to Clay once it returns valid JSON

## Adding Knowledge

1. Create a file in `knowledge_base/[category]/[name].md`
2. Reference it in a skill's "Context Files to Load" section:
   ```markdown
   ## Context Files to Load
   - knowledge_base/frameworks/your-framework.md
   - knowledge_base/voice/writing-style.md
   - clients/{{client_slug}}.md
   ```
3. The server auto-loads referenced files at runtime
4. Industry files in `knowledge_base/industries/` are auto-loaded when `data.industry` matches

## Auth (Optional)

To enable API key auth:
1. Set `WEBHOOK_API_KEY` in Replit's Secrets panel (or `.env` file)
2. Restart the server
3. Add `X-API-Key: your-key` header in Clay's HTTP Action

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `spawn claude ENOENT` | Claude CLI not in PATH. Start with: `PATH="./node_modules/.bin:$PATH" node index.js` |
| `EADDRINUSE port 3000` | Kill old process: `pkill -f node; sleep 1; node index.js` |
| `Credit balance too low` | Re-login: `./node_modules/.bin/claude login` |
| Clay gets 400 HTML error | Use the dev URL (not deployment URL). Check `echo $REPLIT_DEV_DOMAIN` |
| `Skill not found` | Make sure `skills/[name]/skill.md` exists on Replit |
| Empty response from Claude | Check Replit console for errors. May need to re-login |
| Server stops when tab closes | Keep Replit tab open, or use Replit's "Always On" (paid) |

## Key Notes

- **No API key needed** — uses your Claude Code Max subscription via the CLI
- **Dev URL only** — Replit's "Deploy" creates a fresh container without Claude CLI. Use "Run" mode
- **Re-login after restart** — if Replit restarts the container, you may need to run `claude login` again
- **Keep Replit tab open** — the dev server stops when you close the browser tab (unless on a paid plan with Always On)
