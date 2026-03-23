"""Status report worker — generates weekly AI status reports per client.

Runs every 168 hours (weekly). For each active client portal, gathers activity
from the past 7 days and uses claude --print (sonnet) to generate a summary.
Posts the report as a pinned milestone update.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta

logger = logging.getLogger("clay-webhook-os")

REPORT_PROMPT_TEMPLATE = """You are a project status reporter for a client services agency. Summarize the following client portal activity for the past week.

Client: {client_name}
Period: {start_date} to {end_date}

## Updates Posted ({update_count})
{update_summaries}

## Actions
- Created this week: {actions_created}
- Completed this week: {actions_completed}
- Currently overdue: {actions_overdue}
- Blocked by client: {actions_blocked}

## Deliverable Approvals
{approval_summaries}

Write a concise, professional weekly status report in markdown. Include:
1. Key highlights (what got done)
2. Items needing attention (overdue, blocked, pending approval)
3. Upcoming due dates (next 7 days)
4. One-sentence overall health assessment

Keep it under 500 words. Tone: professional, warm, direct. Do not use headers — write flowing paragraphs with bold for emphasis."""


class StatusReportWorker:
    """Background worker that generates weekly AI status reports."""

    def __init__(
        self,
        portal_store,
        portal_notifier=None,
        email_notifier=None,
        interval_hours: int = 168,
    ):
        self._store = portal_store
        self._notifier = portal_notifier
        self._email_notifier = email_notifier
        self._interval = interval_hours * 3600
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("[status-report] Started (interval=%dh)", self._interval // 3600)

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("[status-report] Stopped")

    async def _loop(self) -> None:
        # Initial delay: wait 5 min after startup before first check
        await asyncio.sleep(300)
        while self._running:
            try:
                await self._scan()
            except Exception as e:
                logger.warning("[status-report] Scan error: %s", e)
            await asyncio.sleep(self._interval)

    async def _scan(self) -> None:
        """Scan all portals and generate reports for active clients."""
        portals = self._store.list_portals()

        for portal_info in portals:
            slug = portal_info["slug"]
            if portal_info.get("status") != "active":
                continue

            # Check if we already sent a report this week
            meta = self._store.get_meta(slug)
            last_report = meta.get("last_report_at", 0)
            if time.time() - last_report < (self._interval - 3600):
                continue

            try:
                await self._generate_report(slug)
            except Exception as e:
                logger.warning("[status-report] Failed to generate report for %s: %s", slug, e)

        logger.info("[status-report] Scan complete")

    async def _generate_report(self, slug: str) -> None:
        """Generate and post a weekly status report for a single client."""
        from app.core.claude_executor import ClaudeExecutor

        client_name = self._store._client_name(slug)
        now = time.time()
        week_ago = now - (7 * 86400)
        end_date = datetime.now().strftime("%B %d, %Y")
        start_date = (datetime.now() - timedelta(days=7)).strftime("%B %d, %Y")

        # Gather data
        updates = self._store.get_updates_since(slug, week_ago)
        all_actions = self._store.list_actions(slug)

        actions_created = [a for a in all_actions if a.get("created_at", 0) > week_ago]
        actions_completed = [a for a in all_actions if a.get("status") == "done" and a.get("updated_at", 0) > week_ago]
        actions_overdue = [
            a for a in all_actions
            if a.get("status") != "done" and a.get("due_date") and a["due_date"] < datetime.now().strftime("%Y-%m-%d")
        ]
        actions_blocked = [a for a in all_actions if a.get("blocked_by_client") and a.get("status") != "done"]

        # Skip if no activity
        if not updates and not actions_created and not actions_completed:
            logger.info("[status-report] No activity for %s, skipping", slug)
            return

        # Build update summaries
        update_lines = []
        for u in updates[:20]:
            type_label = u.get("type", "update").title()
            update_lines.append(f"- [{type_label}] {u.get('title', 'Untitled')}")
        update_summaries = "\n".join(update_lines) if update_lines else "No updates posted this week."

        # Build approval summaries
        approval_lines = []
        for u in updates:
            if u.get("approval_status") and u.get("type") == "deliverable":
                status = u["approval_status"].replace("_", " ").title()
                approval_lines.append(f"- {u.get('title', 'Untitled')}: {status}")
        approval_summaries = "\n".join(approval_lines) if approval_lines else "No deliverable approvals this week."

        # Build prompt
        prompt = REPORT_PROMPT_TEMPLATE.format(
            client_name=client_name,
            start_date=start_date,
            end_date=end_date,
            update_count=len(updates),
            update_summaries=update_summaries,
            actions_created=len(actions_created),
            actions_completed=len(actions_completed),
            actions_overdue=len(actions_overdue),
            actions_blocked=len(actions_blocked),
            approval_summaries=approval_summaries,
        )

        # Execute via claude --print (sonnet for cost efficiency)
        executor = ClaudeExecutor()
        try:
            result = await executor.execute(prompt, model="sonnet", timeout=60)
            report_body = result.get("result", "") if isinstance(result, dict) else str(result)
        except Exception as e:
            logger.warning("[status-report] Claude execution failed for %s: %s", slug, e)
            return

        if not report_body or len(report_body) < 50:
            logger.warning("[status-report] Empty or too-short report for %s, skipping", slug)
            return

        # Post as pinned milestone
        title = f"Weekly Status Report — {start_date} to {end_date}"
        update = self._store.create_update(
            slug,
            type_="milestone",
            title=title,
            body=report_body,
            author_name="AI Assistant",
            author_org="internal",
        )
        self._store.toggle_pin(slug, update["id"])

        # Track last report time
        self._store.update_meta(slug, {"last_report_at": now})

        # Fire notifications
        if self._notifier:
            try:
                await self._notifier.notify_update_posted(slug, "milestone", title, report_body[:200])
            except Exception:
                pass
        if self._email_notifier:
            try:
                await self._email_notifier.notify_update(slug, "milestone", title, report_body[:300])
            except Exception:
                pass

        logger.info("[status-report] Generated weekly report for %s", slug)

    async def generate_now(self, slug: str) -> dict | None:
        """Manually trigger a report for a specific client. Returns the update entry."""
        try:
            await self._generate_report(slug)
            # Return the latest update (the report we just created)
            updates = self._store.list_updates(slug, limit=1)
            return updates[0] if updates else None
        except Exception as e:
            logger.warning("[status-report] Manual report failed for %s: %s", slug, e)
            return None
