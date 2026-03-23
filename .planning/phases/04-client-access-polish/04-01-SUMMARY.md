---
phase: 04-client-access-polish
plan: 01
subsystem: auth
tags: [share-token, client-access, channels, fastapi, nextjs, sse]

# Dependency graph
requires:
  - phase: 01-chat-backend
    provides: ChannelStore, ChannelOrchestrator, channel session models, SSE streaming endpoints
  - phase: 02-chat-frontend-core-ui
    provides: useChat hook, chat page, SessionList, ChatThread, ChatInput, FunctionPicker components
provides:
  - Client-scoped channel endpoints with share token validation (4 new routes)
  - Client chat page at /chat/{slug}?token=xxx&fn=function-id
  - useChat hook supporting both internal (API key) and client (share token) auth modes
  - client_slug field on channel models for session ownership scoping
affects: [04-client-access-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Share token auth for client channel access (reuse portal_store.validate_share_token)"
    - "Auth middleware bypass for /channels/client paths (token validated in endpoint)"
    - "useChat options pattern for dual auth mode (isClientMode branching)"

key-files:
  created:
    - dashboard/src/app/chat/[slug]/page.tsx
  modified:
    - app/models/channels.py
    - app/core/channel_store.py
    - app/routers/channels.py
    - app/middleware/auth.py
    - dashboard/src/lib/types.ts
    - dashboard/src/lib/api.ts
    - dashboard/src/hooks/use-chat.ts

key-decisions:
  - "Reuse portal_store.validate_share_token for channel auth -- no new token infrastructure"
  - "Skip fetchFunctions() in client mode to prevent 401 from missing API key"
  - "Client page uses fn query param for function selection instead of FunctionPicker component"
  - "Auth middleware bypasses /channels/client paths entirely -- token validation happens in endpoint handlers"

patterns-established:
  - "Client endpoint pattern: /channels/client/{slug}/* with query param token=xxx"
  - "useChat options interface for auth mode switching without duplicating hook logic"

requirements-completed: [AUTH-01, AUTH-02]

# Metrics
duration: 5min
completed: 2026-03-23
---

# Phase 04 Plan 01: Client Share Token Auth Summary

**Share token auth for client chat access -- 4 backend endpoints, client chat page at /chat/{slug}, dual-mode useChat hook**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-23T15:15:17Z
- **Completed:** 2026-03-23T15:20:49Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Backend has 4 client-scoped channel endpoints (create session, list sessions, get session, send message) with share token validation via PortalStore
- Client chat page at /chat/{slug}?token=xxx&fn=function-id renders without FunctionPicker and without API key auth
- useChat hook supports both internal and client modes via isClientMode branching -- skips fetchFunctions() for clients
- Auth middleware bypasses API key check for /channels/client paths (token validated per-endpoint)

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend -- Add client_slug to models, store filtering, and client channel endpoints** - `f2b1a7d` (feat)
2. **Task 2: Frontend -- Client chat page, API functions with token support, useChat auth params** - `8d32c89` (feat)

## Files Created/Modified
- `app/models/channels.py` - Added client_slug field to ChannelSession, CreateSessionRequest, SessionSummary
- `app/core/channel_store.py` - Added client_slug param to create_session, filtering in list_sessions, get_session_if_owned method
- `app/routers/channels.py` - Added _validate_client_token helper and 4 client endpoints (POST/GET create/list/get/message)
- `app/middleware/auth.py` - Added /channels/client to PUBLIC_GET_PREFIXES and POST bypass
- `dashboard/src/lib/types.ts` - Added client_slug to ChannelSession and ChannelSessionSummary interfaces
- `dashboard/src/lib/api.ts` - Added createClientChannel, fetchClientChannels, fetchClientChannel, streamClientChannelMessage
- `dashboard/src/hooks/use-chat.ts` - Added UseChatOptions interface with clientSlug/shareToken/clientFunctionId, isClientMode branching
- `dashboard/src/app/chat/[slug]/page.tsx` - New client chat page with token from URL, no FunctionPicker, Access Denied state

## Decisions Made
- Reused portal_store.validate_share_token for channel auth rather than building new token infrastructure
- Skipped fetchFunctions() in client mode to prevent 401 -- clients don't have API keys
- Used fn query param for function selection on client page instead of FunctionPicker (which requires API key for fetchFunctions)
- Auth middleware bypasses /channels/client paths entirely (both GET and POST) since token validation happens in endpoint handlers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all data paths are wired to live endpoints.

## Next Phase Readiness
- Client access is functional, ready for plan 02 (polish/refinement)
- Share token infrastructure from portal is proven and reused

## Self-Check: PASSED

All 8 files verified present. Both task commits (f2b1a7d, 8d32c89) verified in git log.

---
*Phase: 04-client-access-polish*
*Completed: 2026-03-23*
