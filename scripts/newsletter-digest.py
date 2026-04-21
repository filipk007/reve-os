#!/usr/bin/env python3
"""newsletter-digest — Weekly Friday digest of all newsletters, powered by Haiku.

Searches for newsletters auto-archived during the week, fetches their content,
and produces a summarized digest delivered as a Gmail draft to yourself.

Usage:
    newsletter-digest                    # generate digest + save as Gmail draft
    newsletter-digest --print-only       # just print to terminal
    newsletter-digest --days 14          # look back 14 days instead of 7

Requires: anthropic>=0.92.0, gws CLI
"""

import argparse
import json
import re
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Error: 'anthropic' package required. Run: pip install anthropic>=0.92.0")
    sys.exit(1)

CONFIG_FILE = Path.home() / ".deepline-find.json"
DIGEST_DIR = Path.home() / ".deepline" / "newsletter-digests"

# Known newsletter patterns — expanded automatically as triage learns
NEWSLETTER_SENDERS = [
    "substack.com",
    "mail.beehiiv.com",
    "convertkit.com",
    "mailchimp.com",
    "hubspot.com",
    "info.vercel.com",
    "clay.com",
    "mail.findymail.com",
    "sumble.com",
    "scrapegraphai.com",
]

# Exclude patterns (receipts, transactional, notifications)
EXCLUDE_PATTERNS = [
    "receipt", "invoice", "payment", "billing",
    "password reset", "verify your email", "confirm your",
    "invitation to", "invited you to",
    "security alert", "sign-in",
]

# ── GWS CLI Helpers ─────────────────────────────────────────

def gws(service: str, resource: str, method: str, params: dict | None = None,
        body: dict | None = None) -> dict:
    """Call the gws CLI and return parsed JSON."""
    cmd = ["gws", "gmail", service, resource, method]
    if params:
        cmd += ["--params", json.dumps(params)]
    if body:
        cmd += ["--json", json.dumps(body)]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        return {}

    output = result.stdout.strip()
    lines = [l for l in output.split("\n") if not l.startswith("Using keyring")]
    try:
        return json.loads("\n".join(lines))
    except json.JSONDecodeError:
        return {}


def search_newsletters(days: int = 7) -> list[dict]:
    """Search for newsletter-type emails from the past N days."""
    after = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y/%m/%d")

    # Search in categories that typically contain newsletters
    queries = [
        f"after:{after} category:promotions",
        f"after:{after} category:updates -category:social",
    ]

    all_messages = {}
    for q in queries:
        data = gws("users", "messages", "list",
                    params={"userId": "me", "q": q, "maxResults": 50})
        for m in data.get("messages", []):
            all_messages[m["id"]] = m

    # Fetch metadata for each
    newsletters = []
    for msg_id in all_messages:
        msg = gws("users", "messages", "get",
                  params={"userId": "me", "id": msg_id, "format": "full"})
        if not msg:
            continue

        headers = {h["name"]: h["value"]
                   for h in msg.get("payload", {}).get("headers", [])}
        from_addr = headers.get("From", "").lower()
        subject = headers.get("Subject", "")

        # Filter: must look like a newsletter
        is_newsletter = any(sender in from_addr for sender in NEWSLETTER_SENDERS)
        # Also check List-Unsubscribe header (strong newsletter signal)
        has_unsubscribe = any(h["name"] == "List-Unsubscribe"
                             for h in msg.get("payload", {}).get("headers", []))
        if not is_newsletter and not has_unsubscribe:
            continue

        # Exclude transactional emails
        subject_lower = subject.lower()
        if any(exc in subject_lower for exc in EXCLUDE_PATTERNS):
            continue

        # Extract body text
        body_text = _extract_body(msg.get("payload", {}))

        newsletters.append({
            "id": msg_id,
            "from": headers.get("From", "?"),
            "subject": subject,
            "date": headers.get("Date", "?"),
            "body": body_text[:3000],  # cap per newsletter to manage tokens
            "snippet": msg.get("snippet", "")[:300],
        })

    # Sort by date (newest first)
    newsletters.sort(key=lambda x: x["date"], reverse=True)
    return newsletters


def _extract_body(payload: dict) -> str:
    """Extract plain text body from Gmail message payload."""
    import base64

    # Direct body
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")

    # Multipart — find text/plain part
    for part in payload.get("parts", []):
        if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
        # Nested multipart
        if part.get("parts"):
            result = _extract_body(part)
            if result:
                return result

    # Fallback: try text/html and strip tags
    for part in payload.get("parts", []):
        if part.get("mimeType") == "text/html" and part.get("body", {}).get("data"):
            html = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
            return _strip_html(html)

    # Direct HTML body
    if payload.get("mimeType") == "text/html" and payload.get("body", {}).get("data"):
        html = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")
        return _strip_html(html)

    return ""


def _strip_html(html: str) -> str:
    """Rough HTML to text conversion."""
    text = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL)
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()[:3000]


# ── Digest Agent ────────────────────────────────────────────

DIGEST_SYSTEM_PROMPT = """\
You are Mangu, a weekly newsletter digest agent. Read all newsletters and produce a \
SHORT, scannable digest that fits on ONE page. Think executive briefing, not book report.

## Output Format
Return ONLY valid JSON (no markdown fences):
{
  "digest_date": "Week of April 7-11, 2026",
  "total_newsletters": 39,
  "trends": [
    "Trend 1 — a pattern you noticed across multiple newsletters (one sentence)",
    "Trend 2 — another cross-cutting theme (one sentence)",
    "Trend 3 — one more (one sentence)"
  ],
  "worth_reading": [
    {
      "newsletter": "GTMnow",
      "subject": "How Zapier got to 97% AI adoption",
      "one_liner": "One sentence on why this is worth 5 minutes of reading",
      "from": "sender name"
    }
  ],
  "skip_summary": "One sentence covering what the other N newsletters were about (the ones not worth reading)"
}

## Rules
- BREVITY IS EVERYTHING. The entire output must fit in one Slack message.
- "trends" = 3-4 cross-cutting themes across ALL newsletters. Not per-newsletter summaries.
- "worth_reading" = MAX 5 newsletters that are genuinely worth the user's time. Only the best.
- "skip_summary" = one sentence covering everything else ("The rest were mostly X, Y, and Z")
- No per-newsletter takeaways. No action items. No relevance scores. Just: trends, best reads, skip the rest.
- The user is a GTM engineer building sales automation with AI agents. Filter for that lens.
"""


def run_digest_agent(newsletters: list[dict], api_key: str) -> dict | None:
    """Run digest with Haiku via the Messages API."""
    client = anthropic.Anthropic(api_key=api_key)

    parts = [f"## NEWSLETTERS THIS WEEK ({len(newsletters)} total)\n"]
    for i, nl in enumerate(newsletters, 1):
        parts.append(f"### {i}. {nl['subject']}")
        parts.append(f"From: {nl['from']}")
        parts.append(f"Date: {nl['date']}")
        parts.append(f"\n{nl['body']}\n")
        parts.append("---\n")
    payload = "\n".join(parts)

    start = time.time()
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=8192,
            system=DIGEST_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": payload}],
        )
    except Exception as e:
        print(f"  Error calling Anthropic: {e}", file=sys.stderr)
        return None

    duration = round(time.time() - start, 1)
    print(f"  Digest generated in {duration}s")

    final_text = ""
    for block in response.content:
        if hasattr(block, "text"):
            final_text = block.text
            break

    return _parse_json(final_text)


def _parse_json(text: str) -> dict | None:
    if not text:
        return None
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass
    match = re.search(r"```(?:json)?\s*\n(.*?)\n\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except (json.JSONDecodeError, TypeError):
            pass
    start = text.find("{")
    if start >= 0:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except (json.JSONDecodeError, TypeError):
                        pass
                    break
    return None


# ── Display & Delivery ──────────────────────────────────────

def format_digest_text(digest: dict) -> str:
    """Format digest for terminal (compact, one page)."""
    lines = []
    lines.append(f"Weekly Newsletter Digest — {digest.get('digest_date', 'This Week')}")
    lines.append(f"{digest.get('total_newsletters', 0)} newsletters scanned\n")

    trends = digest.get("trends", [])
    if trends:
        lines.append("TRENDS:")
        for t in trends:
            lines.append(f"  > {t}")
        lines.append("")

    reads = digest.get("worth_reading", [])
    if reads:
        lines.append("WORTH READING:")
        for r in reads[:5]:
            lines.append(f"  * {r.get('newsletter', '')} — {r.get('subject', '')}")
            lines.append(f"    {r.get('one_liner', '')}")
        lines.append("")

    skip = digest.get("skip_summary", "")
    if skip:
        lines.append(f"THE REST: {skip}")

    return "\n".join(lines)


def format_digest_html(digest: dict) -> str:
    """Format digest as HTML email."""
    sections_html = ""
    for section in digest.get("sections", []):
        relevance = section.get("relevance", "medium")
        color = {"high": "#22c55e", "medium": "#eab308", "low": "#94a3b8"}.get(relevance, "#94a3b8")
        takeaways = "".join(f"<li>{t}</li>" for t in section.get("key_takeaways", []))
        reason = f"<p style='color:#64748b;font-size:13px;margin:4px 0 0;'>Why: {section.get('relevance_reason', '')}</p>" if section.get("relevance_reason") else ""
        sections_html += f"""
        <div style="margin-bottom:16px;padding:12px;border-left:3px solid {color};background:#f8fafc;">
          <strong>{section.get('newsletter', '')}</strong>
          <div style="color:#64748b;font-size:13px;">{section.get('subject', '')}</div>
          <ul style="margin:8px 0;padding-left:20px;">{takeaways}</ul>
          {reason}
        </div>"""

    highlights = "".join(f"<li><strong>{h}</strong></li>" for h in digest.get("highlights", []))
    actions = "".join(f"<li>{a}</li>" for a in digest.get("action_items", []))
    actions_section = f"<h3>Action Items</h3><ul>{actions}</ul>" if actions else ""

    return f"""
    <div style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2>Weekly Newsletter Digest</h2>
      <p style="color:#64748b;">{digest.get('digest_date', 'This Week')} — {digest.get('total_newsletters', 0)} newsletters</p>

      <div style="background:#f0fdf4;padding:12px;border-radius:8px;margin-bottom:20px;">
        <strong>Top Highlights</strong>
        <ul>{highlights}</ul>
      </div>

      {sections_html}

      {actions_section}

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
      <p style="color:#94a3b8;font-size:12px;">Generated by Mangu — your inbox autopilot</p>
    </div>"""


def create_digest_draft(html_body: str) -> None:
    """Create a Gmail draft with the digest (sent to self)."""
    today = datetime.now().strftime("%b %d, %Y")
    result = subprocess.run(
        ["gws", "gmail", "users", "drafts", "create",
         "--params", json.dumps({"userId": "me"}),
         "--json", json.dumps({
             "message": {
                 "raw": _encode_email(
                     to="fermin@thekiln.com",
                     subject=f"Weekly Newsletter Digest — {today}",
                     html_body=html_body,
                 )
             }
         })],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode == 0:
        print("  Draft created in Gmail!")
    else:
        print(f"  Warning: Could not create draft: {result.stderr.strip()}")


def _encode_email(to: str, subject: str, html_body: str) -> str:
    """Encode an email as base64url for Gmail API."""
    import base64
    msg = (
        f"To: {to}\r\n"
        f"Subject: {subject}\r\n"
        f"Content-Type: text/html; charset=utf-8\r\n"
        f"\r\n"
        f"{html_body}"
    )
    return base64.urlsafe_b64encode(msg.encode("utf-8")).decode("ascii")


def format_slack_blocks(digest: dict) -> list[dict]:
    """Format digest as compact Slack Block Kit blocks (fits one page)."""
    blocks: list[dict] = []

    # Header
    total = digest.get("total_newsletters", 0)
    blocks.append({
        "type": "header",
        "text": {"type": "plain_text",
                 "text": f"Weekly Newsletter Digest — {digest.get('digest_date', 'This Week')}"}
    })
    blocks.append({
        "type": "context",
        "elements": [{"type": "mrkdwn",
                       "text": f"{total} newsletters scanned by Mangu"}]
    })
    blocks.append({"type": "divider"})

    # Trends
    trends = digest.get("trends", [])
    if trends:
        trend_text = "*This Week's Trends*\n" + "\n".join(f":chart_with_upwards_trend: {t}" for t in trends)
        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": trend_text}})
        blocks.append({"type": "divider"})

    # Worth reading (max 5)
    reads = digest.get("worth_reading", [])
    if reads:
        reads_text = "*Worth Reading*\n"
        for r in reads[:5]:
            reads_text += f":bookmark: *{r.get('newsletter', '')}* — _{r.get('subject', '')}_\n"
            reads_text += f"  {r.get('one_liner', '')}\n\n"
        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": reads_text.strip()}})

    # Skip summary
    skip = digest.get("skip_summary", "")
    if skip:
        blocks.append({"type": "context",
                        "elements": [{"type": "mrkdwn", "text": f":fast_forward: _The rest: {skip}_"}]})

    return blocks


def send_to_slack(blocks: list[dict], webhook_url: str, fallback_text: str) -> bool:
    """Send digest to Slack via incoming webhook."""
    import requests as req

    payload = {
        "text": fallback_text[:200],  # fallback for notifications
        "blocks": blocks,
    }

    # Slack has a 50-block limit per message. If we exceed, split into chunks.
    if len(blocks) > 48:
        # Send header + highlights + high-relevance first
        chunk1 = blocks[:25]
        chunk2 = blocks[25:]

        r1 = req.post(webhook_url, json={"text": fallback_text[:200], "blocks": chunk1}, timeout=10)
        r2 = req.post(webhook_url, json={"text": "...continued", "blocks": chunk2}, timeout=10)
        success = r1.status_code == 200 and r2.status_code == 200
    else:
        r = req.post(webhook_url, json=payload, timeout=10)
        success = r.status_code == 200

    if success:
        print("  Digest sent to Slack!")
    else:
        print(f"  Warning: Slack delivery failed.")

    return success


def save_digest(digest: dict, text: str) -> str:
    """Save digest to local file."""
    DIGEST_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d")
    path = DIGEST_DIR / f"digest-{ts}.json"
    path.write_text(json.dumps(digest, indent=2))

    text_path = DIGEST_DIR / f"digest-{ts}.txt"
    text_path.write_text(text)

    return str(path)


# ── Main ────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Weekly newsletter digest powered by Haiku.",
        prog="newsletter-digest",
    )
    parser.add_argument("--print-only", action="store_true",
                        help="Print digest to terminal, don't deliver anywhere")
    parser.add_argument("--slack", action="store_true", default=True,
                        help="Send digest to Slack (default: on)")
    parser.add_argument("--no-slack", action="store_true",
                        help="Skip Slack delivery")
    parser.add_argument("--gmail-draft", action="store_true",
                        help="Also create a Gmail draft")
    parser.add_argument("--days", type=int, default=7,
                        help="Look back N days for newsletters (default 7)")
    args = parser.parse_args()

    # Load API key
    if not CONFIG_FILE.exists():
        print("Error: No config found. Run: deepline-find --setup")
        sys.exit(1)
    config = json.loads(CONFIG_FILE.read_text())
    api_key = config.get("anthropic_api_key", "")
    if not api_key:
        print("Error: No Anthropic API key configured.")
        sys.exit(1)

    # Step 1: Find newsletters
    print(f"  Searching for newsletters from the past {args.days} days...")
    newsletters = search_newsletters(args.days)
    print(f"  Found {len(newsletters)} newsletters.\n")

    if not newsletters:
        print("  No newsletters found! Your inbox must be pretty clean.")
        return

    # Show what was found
    print("  Newsletters to summarize:")
    for i, nl in enumerate(newsletters, 1):
        print(f"    {i}. {nl['subject'][:60]}")
        print(f"       {nl['from'][:50]}")
    print()

    # Step 2: Run digest agent
    print("  Running Haiku digest agent...")
    digest = run_digest_agent(newsletters, api_key)

    if not digest:
        print("  Error: Agent returned no results.")
        sys.exit(1)

    # Step 3: Format and display
    text_output = format_digest_text(digest)
    print(f"\n{text_output}")

    # Step 4: Save locally
    saved = save_digest(digest, text_output)
    print(f"  Saved to: {saved}")

    # Step 5: Deliver
    if not args.print_only:
        # Slack delivery (default)
        if not args.no_slack:
            slack_webhook = config.get("slack_webhook", "")
            if slack_webhook:
                print("  Sending to Slack...")
                blocks = format_slack_blocks(digest)
                send_to_slack(blocks, slack_webhook, text_output[:200])
            else:
                print("  Slack webhook not configured. Add 'slack_webhook' to ~/.deepline-find.json")
                print("  Or run with --no-slack to skip.")

        # Gmail draft (opt-in)
        if args.gmail_draft:
            print("  Creating Gmail draft...")
            html_output = format_digest_html(digest)
            create_digest_draft(html_output)


if __name__ == "__main__":
    main()
