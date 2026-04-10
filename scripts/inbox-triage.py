#!/usr/bin/env python3
"""inbox-triage — ADHD-friendly daily email triage powered by Haiku Managed Agent.

Scans your Gmail inbox, categorizes emails into priority buckets,
auto-archives noise, and learns from your corrections over time.

Usage:
    inbox-triage                    # full run: triage + apply labels + archive
    inbox-triage --dry-run          # show what would happen, don't modify
    inbox-triage --detect-only      # only detect corrections from last run
    inbox-triage --show-learnings   # show accumulated learnings

Labels used:
    Mangu/P0-Urgent      (Label_1) — needs response TODAY
    Mangu/P1-Important   (Label_3) — deep work, batch during focus time
    Mangu/FYI            (Label_2) — informational, read when you want
    Mangu/Auto-Archived  (Label_4) — noise, removed from inbox (NEVER deleted)

Requires: anthropic>=0.92.0, gws CLI
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Error: 'anthropic' package required. Run: pip install anthropic>=0.92.0")
    sys.exit(1)

# ── Paths ───────────────────────────────────────────────────

DATA_DIR = Path.home() / ".deepline" / "inbox-triage"
TRIAGE_LOG = DATA_DIR / "triage-log.json"
LEARNINGS_FILE = DATA_DIR / "learnings.json"
CONFIG_FILE = Path.home() / ".deepline-find.json"  # shared config with deepline-find

LABEL_MAP = {
    "P0-Urgent": "Label_1",
    "P1-Important": "Label_3",
    "FYI": "Label_2",
    "Auto-Archived": "Label_4",
}

# ── GWS CLI Helpers ─────────────────────────────────────────

def gws(service: str, resource: str, method: str, params: dict | None = None,
        body: dict | None = None, dry_run: bool = False) -> dict:
    """Call the gws CLI and return parsed JSON."""
    cmd = ["gws", "gmail", service, resource, method]
    if params:
        cmd += ["--params", json.dumps(params)]
    if body:
        cmd += ["--json", json.dumps(body)]
    if dry_run:
        cmd += ["--dry-run"]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        print(f"  [gws error] {result.stderr.strip()}", file=sys.stderr)
        return {}

    # Skip the "Using keyring backend" line
    output = result.stdout.strip()
    lines = output.split("\n")
    json_lines = [l for l in lines if not l.startswith("Using keyring")]
    try:
        return json.loads("\n".join(json_lines))
    except json.JSONDecodeError:
        return {}


def fetch_inbox_threads(max_results: int = 30) -> list[dict]:
    """Fetch inbox threads with metadata."""
    data = gws("users", "threads", "list",
               params={"userId": "me", "labelIds": ["INBOX"], "maxResults": max_results})
    threads = data.get("threads", [])

    enriched = []
    for t in threads:
        tid = t["id"]
        thread_data = gws("users", "threads", "get",
                          params={"userId": "me", "id": tid, "format": "metadata",
                                  "metadataHeaders": ["From", "To", "Subject", "Date"]})
        messages = thread_data.get("messages", [])
        if not messages:
            continue

        latest = messages[-1]
        headers = {h["name"]: h["value"] for h in latest.get("payload", {}).get("headers", [])}
        enriched.append({
            "thread_id": tid,
            "from": headers.get("From", "?"),
            "to": headers.get("To", "?"),
            "subject": headers.get("Subject", "?"),
            "date": headers.get("Date", "?"),
            "labels": latest.get("labelIds", []),
            "snippet": latest.get("snippet", "")[:250],
        })

    return enriched


def fetch_sent_no_reply(days: int = 7) -> list[dict]:
    """Fetch sent emails from last N days to check for waiting-on."""
    from datetime import timedelta
    after = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y/%m/%d")
    data = gws("users", "messages", "list",
               params={"userId": "me", "q": f"from:me after:{after} in:sent", "maxResults": 20})
    messages = data.get("messages", [])

    results = []
    for m in messages:
        msg = gws("users", "messages", "get",
                  params={"userId": "me", "id": m["id"], "format": "metadata",
                          "metadataHeaders": ["From", "To", "Subject", "Date"]})
        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        results.append({
            "message_id": m["id"],
            "thread_id": m.get("threadId", ""),
            "from": headers.get("From", "?"),
            "to": headers.get("To", "?"),
            "subject": headers.get("Subject", "?"),
            "date": headers.get("Date", "?"),
            "snippet": msg.get("snippet", "")[:250],
        })

    return results


def get_thread_labels(thread_id: str) -> list[str]:
    """Get current labels for a thread."""
    data = gws("users", "threads", "get",
               params={"userId": "me", "id": thread_id, "format": "minimal"})
    messages = data.get("messages", [])
    if messages:
        return messages[-1].get("labelIds", [])
    return []


def apply_triage(thread_id: str, label_id: str, archive: bool, dry_run: bool = False) -> None:
    """Apply label. P0 stays in inbox, everything else moves to folder. NEVER delete."""
    body: dict = {"addLabelIds": [label_id]}
    if archive:
        body["removeLabelIds"] = ["INBOX"]

    if dry_run:
        action = f"label={label_id}" + (" + archive" if archive else "")
        print(f"    [dry-run] {thread_id}: {action}")
        return

    gws("users", "threads", "modify",
        params={"userId": "me", "id": thread_id},
        body=body)


# ── Learning Loop ───────────────────────────────────────────

def load_learnings() -> list[dict]:
    if LEARNINGS_FILE.exists():
        return json.loads(LEARNINGS_FILE.read_text())
    return []


def save_learnings(learnings: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LEARNINGS_FILE.write_text(json.dumps(learnings, indent=2))


def load_triage_log() -> list[dict]:
    if TRIAGE_LOG.exists():
        return json.loads(TRIAGE_LOG.read_text())
    return []


def save_triage_log(log: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    TRIAGE_LOG.write_text(json.dumps(log, indent=2))


def detect_corrections() -> list[dict]:
    """Compare last run's triage log against current Gmail state to find corrections."""
    log = load_triage_log()
    if not log:
        return []

    corrections = []
    for entry in log:
        tid = entry["thread_id"]
        current_labels = get_thread_labels(tid)

        if not current_labels:
            continue  # thread may have been deleted externally

        agent_label = entry.get("label_applied", "")
        was_archived = entry.get("archived", False)

        # Check: did user remove the agent's label?
        label_removed = agent_label and agent_label not in current_labels

        # Check: did user move it back to inbox after archive?
        moved_back = was_archived and "INBOX" in current_labels

        # Check: did user add a different Mangu label?
        mangu_labels = [l for l in current_labels if l in LABEL_MAP.values()]
        relabeled = mangu_labels and mangu_labels != [agent_label]

        if label_removed or moved_back or relabeled:
            user_label = mangu_labels[0] if mangu_labels else "INBOX"
            user_bucket = next(
                (k for k, v in LABEL_MAP.items() if v == user_label),
                "kept in inbox"
            )
            corrections.append({
                "thread_id": tid,
                "from": entry.get("from", "?"),
                "subject": entry.get("subject", "?"),
                "agent_did": entry.get("bucket", "?"),
                "user_corrected_to": user_bucket,
                "detected_at": datetime.now(timezone.utc).isoformat(),
            })

    return corrections


def apply_corrections_to_learnings(corrections: list[dict]) -> list[dict]:
    """Merge new corrections into the learnings file."""
    learnings = load_learnings()

    for c in corrections:
        # Extract sender pattern (email address)
        from_raw = c.get("from", "")
        # Try to extract email from "Name <email>" format
        if "<" in from_raw and ">" in from_raw:
            from_pattern = from_raw.split("<")[1].split(">")[0].lower()
        else:
            from_pattern = from_raw.strip().lower()

        # Check if we already have a learning for this sender
        existing = next((l for l in learnings if l.get("from_pattern") == from_pattern), None)

        if existing:
            existing["corrections"] = existing.get("corrections", 0) + 1
            existing["user_prefers"] = c["user_corrected_to"]
            existing["last_corrected"] = c["detected_at"]
            existing["rule"] = f"Categorize as {c['user_corrected_to']}, not {c['agent_did']}"
        else:
            learnings.append({
                "from_pattern": from_pattern,
                "subject_example": c.get("subject", ""),
                "agent_did": c["agent_did"],
                "user_prefers": c["user_corrected_to"],
                "rule": f"Categorize as {c['user_corrected_to']}, not {c['agent_did']}",
                "corrections": 1,
                "first_corrected": c["detected_at"],
                "last_corrected": c["detected_at"],
            })

    save_learnings(learnings)
    return learnings


# ── Agent ───────────────────────────────────────────────────

TRIAGE_SYSTEM_PROMPT = """\
You are Mangu, an ADHD-friendly email triage agent. Sort emails into priority buckets.

## Labels
- P0-Urgent (Label_1) — needs response TODAY, < 2 min action (quick wins for momentum)
- P1-Important (Label_3) — deep work, batch during focus time
- FYI (Label_2) — informational, read when you want
- Auto-Archived (Label_4) — noise: newsletters, promotions, notifications. Remove from inbox.

## Rules
- NEVER delete emails. Every email gets a label.
- P0-Urgent: set "archive": false — these STAY in inbox. This is the user's daily action list.
- P1, FYI, Auto-Archived: set "archive": true — move to label folder, OUT of inbox.
- The inbox = today's to-do list. Only P0 lives there.
- Real people about real work = P0 or P1
- Newsletters, promotions, marketing = Auto-Archived (unless user learnings say otherwise)
- Calendar invites needing response = P0
- Calendar reminders for past events = Auto-Archived
- Receipts/invoices = Auto-Archived
- Duplicate notifications = keep latest, archive older
- Cold outbound from sales reps = Auto-Archived
- Credit/account alerts from paid tools = P0
- Slack workspace invites tied to real partnerships = P1

## Output
Return ONLY valid JSON (no markdown fences):
{
  "triage": [
    {
      "thread_id": "...",
      "subject": "...",
      "from": "...",
      "bucket": "P0-Urgent|P1-Important|FYI|Auto-Archived",
      "label_id": "Label_1|Label_2|Label_3|Label_4",
      "archive": true/false,
      "reason": "one line why"
    }
  ],
  "waiting_on": [
    {
      "thread_id": "...",
      "subject": "...",
      "sent_to": "...",
      "sent_date": "...",
      "days_waiting": 2,
      "suggested_action": "..."
    }
  ],
  "digest_summary": "2-3 sentence morning briefing"
}
"""


def build_inbox_payload(threads: list[dict], sent: list[dict], learnings: list[dict]) -> str:
    """Build the user message with inbox data + learnings context."""
    parts = []

    # Learnings context
    if learnings:
        parts.append("## LEARNED PREFERENCES (from your past corrections)")
        parts.append("Apply these rules — they override default categorization:\n")
        for l in learnings:
            parts.append(f"- Sender: {l['from_pattern']} → {l['rule']} "
                         f"(corrected {l['corrections']}x)")
        parts.append("")

    # Inbox data
    parts.append(f"## INBOX ({len(threads)} threads, newest first)\n")
    for i, t in enumerate(threads, 1):
        parts.append(f"{i}. thread_id: {t['thread_id']}")
        parts.append(f"   From: {t['from']}")
        parts.append(f"   To: {t['to']}")
        parts.append(f"   Subject: {t['subject']}")
        parts.append(f"   Date: {t['date']}")
        parts.append(f"   Labels: {t['labels']}")
        parts.append(f"   Snippet: {t['snippet']}")
        parts.append("")

    # Sent emails for waiting-on
    if sent:
        parts.append(f"## SENT EMAILS (last 7 days) — check for waiting-on\n")
        for i, s in enumerate(sent, 1):
            parts.append(f"{i}. thread_id: {s['thread_id']}")
            parts.append(f"   From: {s['from']}")
            parts.append(f"   To: {s['to']}")
            parts.append(f"   Subject: {s['subject']}")
            parts.append(f"   Date: {s['date']}")
            parts.append(f"   Snippet: {s['snippet']}")
            parts.append("")

    # Context
    today = datetime.now().strftime("%A %B %d, %Y")
    parts.append(f"## CONTEXT")
    parts.append(f"- Today is {today}")
    parts.append(f"- User is Fermin (fermin@thekiln.com), GTM engineer at The Kiln")
    parts.append(f"- The Kiln uses Parallel.ai, Findymail, ScrapeGraphAI, Sumble as paid tools")

    return "\n".join(parts)


def run_triage_agent(payload: str, api_key: str) -> dict | None:
    """Run triage with Haiku via the Messages API."""
    client = anthropic.Anthropic(api_key=api_key)

    start = time.time()
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=8192,
            system=TRIAGE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": payload}],
        )
    except Exception as e:
        print(f"  Error calling Anthropic: {e}", file=sys.stderr)
        return None

    duration = round(time.time() - start, 1)
    print(f"  Triage completed in {duration}s")

    final_text = ""
    for block in response.content:
        if hasattr(block, "text"):
            final_text = block.text
            break

    return _parse_json(final_text)


def _parse_json(text: str) -> dict | None:
    """Extract JSON from agent response."""
    if not text:
        return None
    # Try direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass
    # Try markdown fence
    import re
    match = re.search(r"```(?:json)?\s*\n(.*?)\n\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except (json.JSONDecodeError, TypeError):
            pass
    # Try finding JSON object
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


# ── Display ─────────────────────────────────────────────────

def display_results(result: dict) -> None:
    """Print triage results in a readable format."""
    triage = result.get("triage", [])
    waiting = result.get("waiting_on", [])
    digest = result.get("digest_summary", "")

    if digest:
        print(f"\n  {digest}\n")

    # Group by bucket
    buckets = {"P0-Urgent": [], "P1-Important": [], "FYI": [], "Auto-Archived": []}
    for t in triage:
        bucket = t.get("bucket", "Auto-Archived")
        buckets.setdefault(bucket, []).append(t)

    for bucket_name in ["P0-Urgent", "P1-Important", "FYI"]:
        items = buckets.get(bucket_name, [])
        if items:
            print(f"  {bucket_name} ({len(items)}):")
            for t in items:
                print(f"    - {t['subject'][:60]}")
                print(f"      {t['from'][:40]} — {t['reason']}")
            print()

    archived = buckets.get("Auto-Archived", [])
    if archived:
        print(f"  Auto-Archived ({len(archived)} emails removed from inbox):")
        for t in archived:
            print(f"    - {t['subject'][:60]}")
        print()

    if waiting:
        print(f"  Waiting-On ({len(waiting)}):")
        for w in waiting:
            print(f"    - {w['subject'][:50]} → {w['sent_to'][:30]}")
            print(f"      {w.get('days_waiting', '?')} days — {w.get('suggested_action', '')}")
        print()


# ── Main ────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="ADHD-friendly daily email triage.",
        prog="inbox-triage",
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Show triage plan without modifying Gmail")
    parser.add_argument("--detect-only", action="store_true",
                        help="Only detect corrections from last run")
    parser.add_argument("--show-learnings", action="store_true",
                        help="Show accumulated learnings")
    parser.add_argument("--max-threads", type=int, default=30,
                        help="Max inbox threads to process (default 30)")
    args = parser.parse_args()

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Show learnings
    if args.show_learnings:
        learnings = load_learnings()
        if not learnings:
            print("  No learnings yet. Use your inbox normally — corrections are detected automatically.")
        else:
            print(f"  {len(learnings)} learned preferences:\n")
            for l in learnings:
                print(f"  - {l['from_pattern']}: {l['rule']} ({l['corrections']}x corrected)")
        return

    # Load API key
    if not CONFIG_FILE.exists():
        print("Error: No config found. Run: deepline-find --setup")
        sys.exit(1)
    config = json.loads(CONFIG_FILE.read_text())
    api_key = config.get("anthropic_api_key", "")
    if not api_key:
        print("Error: No Anthropic API key configured.")
        sys.exit(1)

    # Step 1: Detect corrections from last run
    print("  Checking for corrections from last run...")
    corrections = detect_corrections()
    if corrections:
        print(f"  Found {len(corrections)} correction(s):")
        for c in corrections:
            print(f"    - {c['from'][:30]}: was {c['agent_did']} → user moved to {c['user_corrected_to']}")
        learnings = apply_corrections_to_learnings(corrections)
        print(f"  Learnings updated ({len(learnings)} total rules)\n")
    else:
        print("  No corrections detected.\n")
        learnings = load_learnings()

    if args.detect_only:
        return

    # Step 2: Fetch inbox
    print(f"  Fetching inbox (up to {args.max_threads} threads)...")
    threads = fetch_inbox_threads(args.max_threads)
    print(f"  Found {len(threads)} threads in inbox.")

    if not threads:
        print("  Inbox is empty!")
        return

    # Step 3: Fetch sent emails for waiting-on
    print("  Checking sent emails for waiting-on...")
    sent = fetch_sent_no_reply(days=7)
    print(f"  Found {len(sent)} sent emails to check.\n")

    # Step 4: Run triage agent
    print("  Running Haiku triage agent...")
    payload = build_inbox_payload(threads, sent, learnings)
    result = run_triage_agent(payload, api_key)

    if not result:
        print("  Error: Agent returned no results.")
        sys.exit(1)

    # Step 5: Display results
    display_results(result)

    # Step 6: Apply labels (or dry-run)
    triage = result.get("triage", [])

    if args.dry_run:
        print("  === DRY RUN — no changes applied ===\n")
        for t in triage:
            action = t.get("bucket", "?")
            archive = " + archive" if t.get("archive") else ""
            print(f"    {t['thread_id'][:12]}... → {action}{archive}")
    else:
        print("  Applying labels...")
        applied = 0
        for t in triage:
            label_id = t.get("label_id", "")
            archive = t.get("archive", False)
            if label_id:
                apply_triage(t["thread_id"], label_id, archive)
                applied += 1
        print(f"  Applied {applied} labels. Inbox cleaned!")

    # Step 7: Save triage log for next run's correction detection
    log_entries = []
    for t in triage:
        log_entries.append({
            "thread_id": t["thread_id"],
            "from": t.get("from", ""),
            "subject": t.get("subject", ""),
            "bucket": t.get("bucket", ""),
            "label_applied": t.get("label_id", ""),
            "archived": t.get("archive", False),
            "triaged_at": datetime.now(timezone.utc).isoformat(),
        })
    save_triage_log(log_entries)
    print(f"  Triage log saved ({len(log_entries)} entries).")


if __name__ == "__main__":
    main()
