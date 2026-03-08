import type { ColumnDef } from "@tanstack/react-table";
import type { Job } from "@/lib/types";

export interface SpreadsheetRow {
  _index: number;
  _job: Job;
  _original: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Auto-detect columns from CSV headers + result JSON shape.
 * Three groups: fixed, input (from CSV), output (from results).
 */
export function buildColumns(
  csvHeaders: string[],
  jobs: Job[]
): ColumnDef<SpreadsheetRow, unknown>[] {
  const columns: ColumnDef<SpreadsheetRow, unknown>[] = [];

  // Fixed columns: select, #, status, duration
  columns.push({
    id: "select",
    header: ({ table }) => {
      const checked = table.getIsAllRowsSelected();
      const indeterminate = table.getIsSomeRowsSelected();
      return {
        checked,
        indeterminate,
        onChange: table.getToggleAllRowsSelectedHandler(),
      };
    },
    cell: ({ row }) => ({
      checked: row.getIsSelected(),
      onChange: row.getToggleSelectedHandler(),
    }),
    size: 40,
    enableSorting: false,
    enableResizing: false,
  });

  columns.push({
    id: "_index",
    header: "#",
    accessorFn: (row) => row._index + 1,
    size: 50,
    enableResizing: false,
  });

  columns.push({
    id: "_status",
    header: "Status",
    accessorFn: (row) => row._job.status,
    size: 100,
  });

  columns.push({
    id: "_duration",
    header: "Duration",
    accessorFn: (row) => row._job.duration_ms,
    size: 90,
  });

  // Input columns from CSV headers
  for (const header of csvHeaders) {
    columns.push({
      id: `input_${header}`,
      header: header,
      accessorFn: (row) => row._original[header] ?? "",
      size: 140,
      meta: { group: "input" },
    });
  }

  // Output columns from first 10 completed jobs' result keys
  const outputKeys = new Set<string>();
  const completedJobs = jobs.filter((j) => j.status === "completed" && j.result);
  for (const job of completedJobs.slice(0, 10)) {
    if (job.result) {
      for (const key of Object.keys(job.result)) {
        if (!key.startsWith("_")) {
          outputKeys.add(key);
        }
      }
    }
  }

  for (const key of outputKeys) {
    columns.push({
      id: `output_${key}`,
      header: key,
      accessorFn: (row) => {
        const val = row._job.result?.[key];
        if (val === undefined || val === null) return "";
        if (typeof val === "string") return val;
        return JSON.stringify(val);
      },
      size: 180,
      meta: { group: "output" },
    });
  }

  return columns;
}

/**
 * Build spreadsheet rows from jobs + original CSV rows
 */
export function buildRows(
  jobs: Job[],
  originalRows: Record<string, string>[]
): SpreadsheetRow[] {
  return jobs.map((job, i) => ({
    _index: i,
    _job: job,
    _original: originalRows[i] || {},
  }));
}
