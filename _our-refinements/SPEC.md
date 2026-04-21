# Portal / Chat / Transcripts Refinements — Full Spec

Saved 2026-04-09. These changes were built on top of commit `7df139b` (ahead of origin/main by 1). They are NOT merged into origin/main yet.

## How to reapply

The `uncommitted-changes.patch` contains the full diff. The new files (`transcripts.py`, `transcripts-page/`) need to be copied into place. After reapplying, register the transcripts router in `app/main.py` and add the auth middleware exemption.

**Important**: The codebase has changed significantly since these were written. Read the new code first, then reapply the *intent* — not the exact patch. Many files (sidebar, api.ts, types.ts) have been heavily restructured.

---

## 1. Transcripts Tab (`/transcripts`)

**Files**: `app/routers/transcripts.py` (new), `dashboard/src/app/transcripts/page.tsx` (new)

**What it does**:
- Lists transcript files from `transcripts/inbox/` and `transcripts/processed/` on disk
- Shows Inbox (unprocessed) and Processed sections
- "Process in chat" button: creates a channel via API, navigates to `/chat?session=X&prompt=Y` with a pre-filled Phase 1 extraction prompt (7-bucket mandatory extraction: Pain Points, Budget Signals, Decision Process, Competition, Objections, Next Steps, Relationship Cues)
- "Import from Google Doc" card: paste a Google Doc URL → fetches via public export (`docs.google.com/document/d/{id}/export?format=txt`) → writes to inbox
- Mark as processed: moves file from inbox/ to processed/

**Backend endpoints** (`app/routers/transcripts.py`):
- `GET /transcripts` — list all transcripts (inbox + processed)
- `POST /transcripts/mark-processed` — move file
- `GET /transcripts/clients` — list client slugs that have transcripts
- `POST /transcripts/import-gdoc` — admin import (requires API key)
- `POST /transcripts/import-gdoc/public` — client-facing import (validates share token)

**Shared helper**: `_do_gdoc_import(url, client_slug_in, filename)` returns `(status_code, payload_dict)` — used by both admin and public endpoints.

**Router registration**: Add to `app/main.py`:
```python
from app.routers import transcripts
app.include_router(transcripts.router)
```

---

## 2. Auth Middleware Exemption

**File**: `app/middleware/auth.py`

**Change**: Added exemption for public endpoints using share tokens:
```python
if (path.endswith("/public") or "/public/" in path) and request.query_params.get("token"):
    return await call_next(request)
```

**Why**: Portal-view (client-facing share-link page) needs to call POST endpoints (comments, approvals, gdoc import) without an API key. The share token is validated inside each endpoint handler.

---

## 3. Portal Bug Fix — `public_post_comment` AttributeError

**File**: `app/routers/portal.py` (~line 940)

**Bug**: `store.get_update(slug, update_id)` — method doesn't exist on PortalStore. Comment saves successfully but the Slack notifier path crashes, returning 500.

**Fix**: Replace with:
```python
update = next((u for u in store.list_updates(slug, limit=200) if u.get("id") == update_id), None)
```

**Note**: `public_process_approval` at ~line 902 uses `store.process_approval()` which returns the update dict directly — no bug there. Only `public_post_comment` was broken.

---

## 4. Portal-View Page Enhancements

**File**: `dashboard/src/app/portal-view/[slug]/page.tsx`

### 4a. Error visibility in handlers
All four handlers had `catch {} // silently fail`. Changed to show `alert()` with error message:
- `handleToggleAction`
- `handleAcknowledgeSOP`
- `handleApproval`
- `handlePostComment`

### 4b. Google Doc transcript drop card
Client-facing transcript import: paste URL → calls `publicImportGdoc(slug, token, url)`. Shows "✓ Submitted" or error inline.

### 4c. Google Drive folder icon
If `portal.drive_folder_url` exists, shows a FolderOpen icon button in the header next to client name. Clicking opens the Drive folder URL in a new tab.

### 4d. Page title
```typescript
document.title = portal?.name ? `${portal.name} — Portal View` : "Portal View";
```

---

## 5. Branding Renames

### "The Kiln" → "Revenueable"
- `dashboard/src/components/portal/post-card.tsx` — internal post label
- `dashboard/src/components/portal/update-composer.tsx` — `internalLabel = "Revenueable"`
- `dashboard/src/components/portal/documents-view.tsx` — org label

### "Webhook OS" → "Dashboard"
- `dashboard/src/components/layout/sidebar.tsx` — sidebar title text
- `dashboard/src/app/layout.tsx` — browser tab title

### Avatar initial fix
- `post-card.tsx`: Changed hardcoded "K" fallback to `(update.author_name?.trim()?.[0] || orgLabel[0] || "?").toUpperCase()`

---

## 6. Share Link URL Fix

**File**: `app/routers/portal.py` (~line 641)

**Bug**: Hardcoded `dashboard_url = "https://dashboard-beta-sable-36.vercel.app"` when generating share links.

**Fix**:
```python
import os
dashboard_url = os.environ.get("DASHBOARD_PUBLIC_URL", "https://app.revenueable.com").rstrip("/")
```

---

## 7. Clients Page — No Forced Redirect

**File**: `dashboard/src/app/clients/page.tsx`

**Bug**: Page auto-redirected to `/clients/twelve-labs` when only one client existed.

**Fix**: Removed redirect logic entirely. Page lists all clients; user clicks to navigate. Sidebar href changed from `/clients/twelve-labs` to `/clients`.

---

## 8. Client Detail Page Additions

**File**: `dashboard/src/app/clients/[slug]/page.tsx`

### 8a. Google Doc transcript drop card
Admin-facing: paste URL → calls `importGdoc(url, slug)`. Same UX as portal-view version but uses API key auth.

### 8b. Google Drive folder URL editor
Input field + Save button to store `drive_folder_url` in portal meta. Saved via `updatePortal(slug, { drive_folder_url })`.

---

## 9. Google Drive Folder URL Storage

**Files**: 
- `app/models/portal.py` — added `drive_folder_url: str | None` to `UpdatePortalRequest`
- `app/core/portal_store.py` — added `drive_folder_url` to `get_public_portal` return dict
- `dashboard/src/lib/types.ts` — added `drive_folder_url` to `PortalMeta` and `PublicPortalView`
- `dashboard/src/lib/api.ts` — added to `updatePortal` body type

**How it works**: Admin sets the URL in client detail page → stored in `meta.json` → exposed to portal-view via `get_public_portal` → rendered as clickable icon button.

---

## 10. Chat Deep Linking

**File**: `dashboard/src/app/chat/page.tsx`

Added `useSearchParams` to read `?session=` and `?prompt=` query params:
- `?session=X` → calls `chat.loadSession(X)` to resume an existing session
- `?prompt=Y` → pre-fills the chat input with the prompt text

Used by the transcripts page "Process in chat" button.

---

## 11. Chat SSE Streaming + Tool Use Visibility

**Files**: `dashboard/src/hooks/use-chat.ts`, `dashboard/src/components/chat/chat-message.tsx`, `app/core/channel_proxy.py`, `app/routers/channels.py`, `app/models/channels.py`

SSE streaming for chat responses with tool-use visibility:
- Backend proxies Claude's streaming responses as SSE events
- Frontend renders tool calls with expandable detail cards
- Shows thinking indicators during tool execution

---

## Files Summary

| File | Change type |
|---|---|
| `app/routers/transcripts.py` | **NEW** — full transcripts router |
| `dashboard/src/app/transcripts/page.tsx` | **NEW** — transcripts UI |
| `app/routers/portal.py` | BUG FIX (get_update) + share URL fix |
| `app/middleware/auth.py` | /public token exemption |
| `app/main.py` | register transcripts router |
| `app/models/portal.py` | drive_folder_url field |
| `app/core/portal_store.py` | drive_folder_url in public portal |
| `app/core/channel_proxy.py` | SSE streaming |
| `app/routers/channels.py` | streaming endpoint |
| `app/models/channels.py` | streaming models |
| `dashboard/src/app/chat/page.tsx` | deep linking params |
| `dashboard/src/app/clients/page.tsx` | removed forced redirect |
| `dashboard/src/app/clients/[slug]/page.tsx` | drop card + drive editor |
| `dashboard/src/app/portal-view/[slug]/page.tsx` | drop card, drive icon, alerts, title |
| `dashboard/src/app/layout.tsx` | page title |
| `dashboard/src/components/layout/sidebar.tsx` | nav items + label |
| `dashboard/src/components/portal/post-card.tsx` | branding + avatar fix |
| `dashboard/src/components/portal/update-composer.tsx` | branding |
| `dashboard/src/components/portal/documents-view.tsx` | branding |
| `dashboard/src/components/chat/chat-message.tsx` | tool-use rendering |
| `dashboard/src/hooks/use-chat.ts` | SSE streaming hook |
| `dashboard/src/lib/api.ts` | transcript + public API functions |
| `dashboard/src/lib/types.ts` | drive_folder_url types |
