# Phase 3: Batch Results Dashboard - Research

**Researched:** 2026-03-13
**Domain:** Frontend data table with sorting, filtering, CSV export, confidence coloring, and side panel
**Confidence:** HIGH

## Summary

This phase builds a dedicated batch results page at `/batch-results` (or similar) that displays processed batch job data in a rich, interactive data table. The key discovery is that **the entire stack already exists in the codebase**: TanStack React Table v8 is installed and actively used, PapaParse is installed and used for CSV export, the Sheet (side panel) component exists in shadcn/ui, and most importantly, a complete spreadsheet implementation already lives in `dashboard/src/components/batch/spreadsheet/` with sorting, filtering, row selection, virtualization, CSV download, and an expandable row detail panel.

The work for this phase is primarily **composition and enhancement** of existing patterns, not greenfield development. The existing `SpreadsheetView` in the `/run` page batch tab demonstrates every pattern needed. The new page needs to: (1) accept a batch_id via URL, (2) fetch job results via the existing API, (3) render them in the existing spreadsheet component pattern, (4) add confidence-based row coloring (new), and (5) replace the expandable row detail with a Sheet-based side panel for email preview (new).

**Primary recommendation:** Reuse the existing `use-spreadsheet.ts` hook and spreadsheet component patterns wholesale. Add confidence score coloring at the row level and a Sheet-based side panel. The batch API returns job summaries without full results, so individual job fetching via `fetchJob(id)` is needed (same pattern the `/run` page uses).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Batch results page displays all processed rows in a data table | Existing `SpreadsheetView` + `useSpreadsheet` hook provide the exact pattern. TanStack React Table v8 already installed. Data fetched via `fetchBatchStatus()` for summary + `fetchJob()` for full results. |
| DASH-02 | Table columns are sortable by clicking headers | Already implemented in `SpreadsheetHeaderCell` with `ArrowUp`/`ArrowDown`/`ArrowUpDown` icons and `getToggleSortingHandler()`. `getSortedRowModel()` already configured in `useSpreadsheet`. |
| DASH-03 | Table columns are filterable via search/dropdown | Already implemented in `SpreadsheetToolbar` with status dropdown filter and global search input. `getFilteredRowModel()` already configured. |
| DASH-04 | One-click CSV download of batch results | Already implemented in `SpreadsheetView.downloadCsv()` using PapaParse `Papa.unparse()`. Pattern: merge original + result data, create Blob, trigger download via anchor click. |
| DASH-05 | Rows colored green/yellow/red based on confidence score | NEW capability. Requires extracting `confidence_score` from `job.result` and applying conditional Tailwind classes to `<tr>`. Color scheme: green (`bg-status-success/5`), yellow (`bg-kiln-mustard/5`), red (`bg-kiln-coral/5`). Thresholds: >=0.7 green, 0.4-0.7 yellow, <0.4 red. |
| DASH-06 | Clicking a row opens side panel with inline email preview | NEW capability. Replace `RowDetailPanel` (expandable inline) with `Sheet` component (slide-in side panel). Sheet already exists as shadcn/ui component. Email preview renders the generated email content from `job.result` (e.g., `subject_line`, `email_body`). |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | ^8.21.3 | Data table with sorting, filtering, selection | Already used in SpreadsheetView. Headless -- works with any UI. |
| @tanstack/react-virtual | ^3.13.21 | Row virtualization for large datasets | Already used in SpreadsheetView for 100+ row performance. |
| papaparse | ^5.5.3 | CSV generation and download | Already used in SpreadsheetView and CsvUploader. |
| lucide-react | ^0.577.0 | Icons (Download, ArrowUp, ArrowDown, etc.) | Already used project-wide. |
| framer-motion | ^12.35.0 | Animations for side panel transitions | Already used in SpreadsheetRow for expand/collapse. |
| sonner | ^2.0.7 | Toast notifications | Already used project-wide via Toaster in layout. |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| radix-ui | ^1.4.3 | Sheet (side panel) primitive | For the row detail side panel (DASH-06). |
| class-variance-authority | ^0.7.1 | Variant-based styling | For confidence color variants. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack React Table | AG Grid | AG Grid is heavier, not installed, and TanStack is already battle-tested in this codebase |
| PapaParse for CSV | Manual CSV string building | PapaParse handles edge cases (commas in values, quoting) automatically |
| Sheet (side panel) | Dialog/Modal | Sheet slides in from right, preserving table context -- better UX for data exploration |

**Installation:**
```bash
# No installation needed -- all dependencies already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
dashboard/src/
├── app/
│   └── batch-results/
│       └── page.tsx              # New page: /batch-results?id=<batch_id>
├── components/
│   └── batch/
│       ├── spreadsheet/          # EXISTING -- reuse wholesale
│       │   ├── column-utils.ts   # Column + row builders
│       │   ├── use-spreadsheet.ts # TanStack table hook
│       │   ├── spreadsheet-view.tsx
│       │   ├── spreadsheet-row.tsx
│       │   ├── spreadsheet-cell.tsx
│       │   ├── spreadsheet-header.tsx
│       │   ├── spreadsheet-toolbar.tsx
│       │   ├── spreadsheet-footer.tsx
│       │   └── row-detail-panel.tsx
│       ├── results-table.tsx     # EXISTING simpler table
│       ├── batch-progress.tsx    # EXISTING progress bar
│       ├── csv-uploader.tsx      # EXISTING (not needed here)
│       └── email-preview-panel.tsx  # NEW: Sheet-based email preview
├── lib/
│   ├── api.ts                    # EXISTING -- fetchBatchStatus(), fetchJob()
│   ├── types.ts                  # EXISTING -- BatchStatus, Job types
│   └── utils.ts                  # EXISTING -- formatDuration, etc.
```

### Pattern 1: Page with URL-driven Batch ID
**What:** The batch results page reads `batch_id` from URL search params and fetches data on mount.
**When to use:** When navigating from the `/run` page after batch completion, or from a direct link.
**Example:**
```typescript
// Source: Existing pattern in dashboard/src/app/run/page.tsx
"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchBatchStatus, fetchJob } from "@/lib/api";
import type { BatchStatus, Job } from "@/lib/types";

function BatchResultsInner() {
  const searchParams = useSearchParams();
  const batchId = searchParams.get("id");
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (!batchId) return;
    fetchBatchStatus(batchId).then((bs) => {
      setBatchStatus(bs);
      // Fetch full job details for results
      Promise.all(bs.jobs.map((j) => fetchJob(j.id))).then(setJobs);
    });
  }, [batchId]);
  // ...
}
```

### Pattern 2: Confidence Score Color Mapping
**What:** Map `job.result.confidence_score` (0.0-1.0) to row background colors.
**When to use:** On every visible row in the data table.
**Example:**
```typescript
// Source: Project convention -- skill outputs include confidence_score
function getConfidenceColor(score: number | undefined): string {
  if (score === undefined) return "";
  if (score >= 0.7) return "bg-status-success/5 hover:bg-status-success/10";
  if (score >= 0.4) return "bg-kiln-mustard/5 hover:bg-kiln-mustard/10";
  return "bg-kiln-coral/5 hover:bg-kiln-coral/10";
}

// In SpreadsheetRow, extract confidence from job.result:
const confidence = typeof job.result?.confidence_score === "number"
  ? job.result.confidence_score
  : undefined;
```

### Pattern 3: Sheet-Based Side Panel for Email Preview
**What:** Clicking a row opens a Sheet (slide-in panel) from the right showing the full email content.
**When to use:** For DASH-06, replacing the expandable inline `RowDetailPanel`.
**Example:**
```typescript
// Source: Existing Sheet component in dashboard/src/components/ui/sheet.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

<Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
  <SheetContent side="right" className="w-full sm:max-w-lg">
    <SheetHeader>
      <SheetTitle>Email Preview</SheetTitle>
    </SheetHeader>
    {selectedJob?.result && (
      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs text-clay-200 uppercase tracking-wider mb-1">Subject</p>
          <p className="text-clay-100">{selectedJob.result.subject_line}</p>
        </div>
        <div>
          <p className="text-xs text-clay-200 uppercase tracking-wider mb-1">Body</p>
          <div className="prose prose-sm text-clay-200 whitespace-pre-wrap">
            {selectedJob.result.email_body}
          </div>
        </div>
      </div>
    )}
  </SheetContent>
</Sheet>
```

### Pattern 4: Data Fetching with Polling (Existing)
**What:** Poll batch status every 2 seconds while jobs are still processing.
**When to use:** When the batch is not yet fully complete (e.g., navigating to results while processing).
**Example:**
```typescript
// Source: Existing pattern in /run page (lines 275-338)
useEffect(() => {
  if (!batchId || batchDone) return;
  const poll = async () => {
    const bs = await fetchBatchStatus(batchId);
    if (bs.done) {
      // Fetch full job details
      const fullJobs = await Promise.all(bs.jobs.map((j) => fetchJob(j.id)));
      setJobs(fullJobs);
    }
  };
  const interval = setInterval(poll, 2000);
  return () => clearInterval(interval);
}, [batchId, batchDone]);
```

### Anti-Patterns to Avoid
- **Do NOT create a new table component from scratch.** The `SpreadsheetView` + `useSpreadsheet` hook already implement TanStack React Table with sorting, filtering, selection, virtualization, and CSV export. Reuse or extend it.
- **Do NOT fetch all job results in the batch status endpoint.** The `GET /batch/{batch_id}` endpoint returns job summaries (id, row_id, status, duration, tokens, cost) without full `result` data. This is by design to keep the response light. Use `fetchJob(id)` for full results.
- **Do NOT use `useState` for complex table state.** TanStack React Table manages sorting, filtering, and selection state internally. The `useSpreadsheet` hook wraps this correctly.
- **Do NOT inline CSS colors.** Use the existing project color tokens: `clay-*`, `kiln-teal`, `kiln-coral`, `kiln-mustard`, `status-success`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data table with sorting/filtering | Custom sort + filter logic | TanStack React Table `getSortedRowModel()` + `getFilteredRowModel()` | Edge cases: multi-column sort, stable sort, filter debounce |
| CSV export | Manual string building | PapaParse `Papa.unparse(data)` | Handles commas in values, proper quoting, BOM for Excel |
| Side panel (slide-in) | Custom absolute-positioned div | shadcn Sheet (Radix Dialog underneath) | Focus trap, scroll lock, keyboard dismiss, animations |
| Virtual scrolling | Custom windowing | @tanstack/react-virtual `useVirtualizer` | Already handles overscan, dynamic row heights, scroll restoration |
| Row virtualization for 100+ rows | Render all rows | `useVirtualizer` from @tanstack/react-virtual | Already in `SpreadsheetView` -- renders only visible rows |

**Key insight:** Every "hard" UI problem in this phase (sortable tables, CSV export, side panels, virtualization) already has a working implementation in the codebase. The phase is about composing existing pieces into a new page, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Batch Status API Returns Summary, Not Full Results
**What goes wrong:** Trying to display email content from `GET /batch/{batch_id}` response -- it only includes `id`, `row_id`, `status`, `duration_ms`, `input_tokens_est`, `output_tokens_est`, `cost_est_usd` per job. No `result` or `error` fields.
**Why it happens:** The batch status endpoint is designed for progress monitoring, not data exploration.
**How to avoid:** After batch is done, fetch full job details via `Promise.all(jobs.map(j => fetchJob(j.id)))`. This is exactly what the existing `/run` page does.
**Warning signs:** Empty result/error columns in the table, undefined values in email preview.

### Pitfall 2: Confidence Score Location Varies by Skill
**What goes wrong:** Assuming `confidence_score` is always at `job.result.confidence_score`.
**Why it happens:** Different skills may nest confidence differently, or a skill might not output it at all.
**How to avoid:** Use safe access: `job.result?.confidence_score`. If not a number, treat as "no confidence" (no coloring). The classify and email-gen skills both use `confidence_score` at the top level of their output, so this should work for the demo.
**Warning signs:** All rows showing no color despite having results.

### Pitfall 3: Sheet Width on Mobile
**What goes wrong:** The Sheet component defaults to `sm:max-w-sm` which is too narrow for email preview on desktop, and `w-3/4` on mobile can be awkward.
**Why it happens:** The default SheetContent styling in `dashboard/src/components/ui/sheet.tsx` is designed for narrow side panels.
**How to avoid:** Override with `className="w-full sm:max-w-lg"` or `sm:max-w-xl` for email preview panels that need more width.
**Warning signs:** Email content truncated or requiring horizontal scroll.

### Pitfall 4: N+1 API Calls for Large Batches
**What goes wrong:** Fetching 50 individual jobs via 50 API calls when the batch finishes.
**Why it happens:** `fetchJob(id)` is per-job, and the batch status only returns summaries.
**How to avoid:** This is acceptable for demo scale (50 rows = 50 parallel fetches). For production, batch the calls with `Promise.all()` which runs them in parallel. If scale becomes an issue later, a `/batch/{id}/results` endpoint could be added.
**Warning signs:** Slow page load for large batches, too many network requests in DevTools.

### Pitfall 5: Missing Sidebar Navigation Entry
**What goes wrong:** Page exists at `/batch-results` but users can't find it.
**Why it happens:** Forgetting to add a nav item to the sidebar's `NAV_SECTIONS` in `sidebar.tsx`.
**How to avoid:** Add to the "Overview" section of `NAV_SECTIONS` or link from the `/run` page batch results.
**Warning signs:** Users must type the URL directly to access the page.

## Code Examples

Verified patterns from the existing codebase:

### CSV Download (Existing Pattern)
```typescript
// Source: dashboard/src/components/batch/spreadsheet/spreadsheet-view.tsx
const downloadCsv = useCallback(() => {
  const csvRows = jobs.map((job, i) => {
    const original = originalRows[i] || {};
    const result = job.result || {};
    return {
      ...original,
      _status: job.status,
      _duration_ms: job.duration_ms,
      _error: job.error || "",
      ...Object.fromEntries(
        Object.entries(result).map(([k, v]) => [
          `_result_${k}`,
          typeof v === "string" ? v : JSON.stringify(v),
        ])
      ),
    };
  });
  const csv = Papa.unparse(csvRows);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `batch-results-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}, [jobs, originalRows]);
```

### TanStack Table Setup (Existing Pattern)
```typescript
// Source: dashboard/src/components/batch/spreadsheet/use-spreadsheet.ts
const table = useReactTable({
  data: filteredData,
  columns,
  state: { sorting, columnFilters, rowSelection, columnSizing, globalFilter },
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  onRowSelectionChange: setRowSelection,
  onColumnSizingChange: setColumnSizing,
  onGlobalFilterChange: setGlobalFilter,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  enableRowSelection: true,
  enableColumnResizing: true,
  columnResizeMode: "onChange",
  getRowId: (row) => row._job.id,
});
```

### Sortable Header Cell (Existing Pattern)
```typescript
// Source: dashboard/src/components/batch/spreadsheet/spreadsheet-header.tsx
<div
  className={`flex items-center gap-1 ${canSort ? "cursor-pointer hover:text-clay-300" : ""}`}
  onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
>
  {header.column.columnDef.header}
  {canSort && (
    <span className="ml-auto">
      {sorted === "asc" ? <ArrowUp className="h-3 w-3" />
       : sorted === "desc" ? <ArrowDown className="h-3 w-3" />
       : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </span>
  )}
</div>
```

### Page Structure (Existing Pattern)
```typescript
// Source: dashboard/src/app/run/page.tsx
"use client";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";

function BatchResultsInner() {
  // ... component logic
}

export default function BatchResultsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Batch Results" />
      <Suspense>
        <BatchResultsInner />
      </Suspense>
    </div>
  );
}
```

### Batch API Call (Existing Pattern)
```typescript
// Source: dashboard/src/lib/api.ts
export function fetchBatchStatus(batchId: string): Promise<BatchStatus> {
  return apiFetch(`/batch/${batchId}`);
}

export function fetchJob(id: string): Promise<Job> {
  return apiFetch(`/jobs/${id}`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ResultsTable` (simple table) | `SpreadsheetView` (full spreadsheet) | Already in codebase | SpreadsheetView has sorting, filtering, selection, virtualization -- ResultsTable is legacy |
| Inline row expansion | Sheet side panel | This phase | Better UX for email preview -- preserves table context |
| No confidence coloring | Conditional row backgrounds | This phase | Visual signal for data quality at a glance |

**Deprecated/outdated:**
- `ResultsTable` component (`dashboard/src/components/batch/results-table.tsx`): Superseded by `SpreadsheetView`. Still exists but is a simpler, less featured version. Do NOT extend it for this phase.

## Open Questions

1. **Should the batch results page be a standalone route or part of the `/run` page?**
   - What we know: The `/run` page already shows batch results inline after processing. A separate page allows direct linking and bookmarking.
   - What's unclear: Whether users will navigate to batch results independently or only from the `/run` flow.
   - Recommendation: Create `/batch-results?id=<batch_id>` as a standalone page. Add a "View Results" link from the `/run` page after batch completion. This supports both flows.

2. **How to handle batches with no `confidence_score` in results?**
   - What we know: `email-gen` and `classify` skills output `confidence_score`. Other skills may not.
   - What's unclear: Whether the demo will only use skills that output confidence scores.
   - Recommendation: Treat missing confidence score as "neutral" (no background color). The coloring is additive -- rows without scores look normal.

3. **Email preview format varies by skill**
   - What we know: `email-gen` outputs `subject_line` + `email_body`. `classify` outputs `title`/`industry` normalized data. The side panel needs to handle different result shapes.
   - What's unclear: Which skills will be used in the demo flow.
   - Recommendation: Make the side panel generic -- show raw JSON for non-email skills, and render email preview (subject + body) when `subject_line` or `email_body` keys are detected in the result.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None for frontend (no jest/vitest configured in dashboard) |
| Config file | none -- see Wave 0 |
| Quick run command | `cd dashboard && npx next build` (type-check + build) |
| Full suite command | `cd dashboard && npx next build` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Data table renders batch rows | manual | Navigate to `/batch-results?id=<batch_id>` after running a batch | N/A |
| DASH-02 | Click header sorts column | manual | Click column header, verify sort icons toggle | N/A |
| DASH-03 | Filter narrows visible rows | manual | Type in search, select status dropdown | N/A |
| DASH-04 | CSV download works | manual | Click download button, open .csv file | N/A |
| DASH-05 | Confidence coloring shows | manual | Run batch with email-gen/classify, check row colors | N/A |
| DASH-06 | Side panel opens on row click | manual | Click a completed row, verify Sheet slides in | N/A |

### Sampling Rate
- **Per task commit:** `cd dashboard && npx next build` (verifies TypeScript + build)
- **Per wave merge:** `cd dashboard && npx next build`
- **Phase gate:** Build succeeds + manual verification of all 6 requirements

### Wave 0 Gaps
- No frontend test framework installed (jest/vitest) -- all testing is manual + build verification
- No automated UI tests exist in the project -- this is consistent with the current testing approach
- `npx next build` serves as the primary automated check (catches type errors, import errors, build failures)

*(No new test infrastructure needed -- project uses manual testing for frontend per CLAUDE.md backend conventions: "No test suite yet -- manual testing via curl and the dashboard playground")*

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `dashboard/src/components/batch/spreadsheet/` -- full spreadsheet implementation with TanStack React Table
- Codebase inspection: `dashboard/src/lib/api.ts` -- `fetchBatchStatus()` and `fetchJob()` API functions
- Codebase inspection: `dashboard/src/lib/types.ts` -- `BatchStatus`, `Job`, `JobStatus` type definitions
- Codebase inspection: `dashboard/package.json` -- all required dependencies already installed
- Codebase inspection: `app/routers/batch.py` -- backend batch API response shape
- Codebase inspection: `app/core/job_queue.py` -- Job dataclass fields, `get_batch_jobs()` returns summary only

### Secondary (MEDIUM confidence)
- Codebase inspection: `skills/email-gen/skill.md` -- `confidence_score` output field (0.0-1.0)
- Codebase inspection: `skills/classify/skill.md` -- `confidence_score` output field (0.0-1.0)

### Tertiary (LOW confidence)
- None -- all findings verified from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Every library already installed and used in codebase
- Architecture: HIGH - All patterns exist in codebase, just need composition
- Pitfalls: HIGH - Identified from actual API response shapes and component behavior

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- codebase-specific patterns, no external dependencies to shift)
