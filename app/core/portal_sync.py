"""Portal sync — pushes portal content to Google Docs via Drive.

One-way sync: Dashboard → Google Docs. Subsequent syncs update the same doc.
Uses SheetsClient's Drive methods for folder/file management.
"""

import logging
import time

from app.core.portal_store import PortalStore
from app.core.sheets_client import SheetsClient

logger = logging.getLogger("clay-webhook-os")


class PortalSync:
    """Assembles portal content and pushes to Google Drive as a Doc."""

    def __init__(self, sheets_client: SheetsClient, portal_store: PortalStore) -> None:
        self.sheets_client = sheets_client
        self.portal_store = portal_store
        self._root_id: str | None = None

    @property
    def available(self) -> bool:
        return self.sheets_client.available

    async def _ensure_root(self) -> str:
        """Find or create 'Client Portals' root folder in Drive."""
        if self._root_id:
            return self._root_id
        folder_id = await self.sheets_client.find_folder("Client Portals")
        if folder_id:
            self._root_id = folder_id
            return folder_id
        self._root_id = await self.sheets_client.create_folder("Client Portals")
        return self._root_id

    async def sync(self, slug: str) -> dict:
        """Push portal content to Google Drive. Returns sync status."""
        if not self.available:
            raise RuntimeError("Google Workspace sync not available (gws CLI not found)")

        portal = self.portal_store.get_portal(slug)
        if not portal:
            raise ValueError(f"Client '{slug}' not found")

        meta = portal["meta"]
        client_name = portal["name"]

        # Ensure folder structure: Client Portals / {Client Name}
        root_id = await self._ensure_root()
        client_folder_id = meta.get("gws_folder_id")
        if not client_folder_id:
            client_folder_id = await self.sheets_client.find_folder(client_name, parent_id=root_id)
            if not client_folder_id:
                client_folder_id = await self.sheets_client.create_folder(client_name, parent_id=root_id)

        # Build portal doc content as a spreadsheet with tabs
        # Tab 1: Overview, Tab 2: SOPs, Tab 3: Recent Updates
        doc_id = meta.get("gws_doc_id")

        # Create or reuse spreadsheet
        title = f"{client_name} — Portal"
        if not doc_id:
            doc_id = await self.sheets_client.create_spreadsheet(title, folder_id=client_folder_id)
        else:
            # Clear and rewrite existing sheet
            pass  # write_values overwrites

        # Tab 1: Overview
        overview_rows = [
            ["Client Portal", client_name],
            ["Status", meta.get("status", "active")],
            ["SOPs", str(len(portal["sops"]))],
            ["Updates", str(len(portal["recent_updates"]))],
            ["Media Files", str(len(portal["media"]))],
            [""],
            ["Notes", meta.get("notes", "")],
        ]
        await self.sheets_client.write_values(doc_id, "Sheet1!A1", overview_rows)

        # Tab 2: SOPs
        if portal["sops"]:
            try:
                await self.sheets_client.add_sheet_tab(doc_id, "SOPs")
            except RuntimeError:
                pass  # Tab may already exist
            sop_rows = [["Title", "Category", "Content"]]
            for sop in portal["sops"]:
                sop_rows.append([sop["title"], sop["category"], sop["content"][:500]])
            await self.sheets_client.write_values(doc_id, "'SOPs'!A1", sop_rows)

        # Tab 3: Updates
        if portal["recent_updates"]:
            try:
                await self.sheets_client.add_sheet_tab(doc_id, "Updates")
            except RuntimeError:
                pass
            update_rows = [["Type", "Title", "Body", "Pinned"]]
            for upd in portal["recent_updates"]:
                update_rows.append([
                    upd["type"],
                    upd["title"],
                    upd["body"][:500],
                    "Yes" if upd.get("pinned") else "",
                ])
            await self.sheets_client.write_values(doc_id, "'Updates'!A1", update_rows)

        # Update portal metadata with GWS IDs
        now = time.time()
        self.portal_store.update_meta(slug, {
            "gws_folder_id": client_folder_id,
            "gws_doc_id": doc_id,
            "last_synced_at": now,
        })

        url = SheetsClient.get_spreadsheet_url(doc_id)
        logger.info("[portal_sync] Synced portal for %s → %s", slug, url)

        return {
            "ok": True,
            "slug": slug,
            "doc_id": doc_id,
            "url": url,
            "synced_at": now,
        }

    def get_sync_status(self, slug: str) -> dict:
        """Get current sync status for a client portal."""
        meta = self.portal_store.get_meta(slug)
        has_sync = meta.get("gws_doc_id") is not None
        return {
            "slug": slug,
            "synced": has_sync,
            "last_synced_at": meta.get("last_synced_at"),
            "doc_id": meta.get("gws_doc_id"),
            "url": SheetsClient.get_spreadsheet_url(meta["gws_doc_id"]) if has_sync else None,
        }
