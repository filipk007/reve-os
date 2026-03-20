import type { ColumnDef } from "@tanstack/react-table";
import type { SpreadsheetRow } from "./types";

/**
 * Auto-detect columns from input headers + result JSON shape.
 * Three groups: fixed (select, #, status), input (from CSV), output (from results).
 */
export function buildColumns(
  inputHeaders: string[],
  rows: SpreadsheetRow[]
): ColumnDef<SpreadsheetRow, unknown>[] {
  const columns: ColumnDef<SpreadsheetRow, unknown>[] = [];

  // Fixed columns: select, #, status
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
    accessorFn: (_row, index) => index + 1,
    size: 50,
    enableResizing: false,
  });

  columns.push({
    id: "_status",
    header: "Status",
    accessorFn: (row) => row._status,
    size: 100,
  });

  // Input columns from headers
  for (const header of inputHeaders) {
    columns.push({
      id: `input_${header}`,
      header: header,
      accessorFn: (row) => row._original[header] ?? "",
      size: 140,
      meta: { group: "input" },
    });
  }

  // Output columns from first 10 completed rows' result keys
  const outputKeys = new Set<string>();
  const completedRows = rows.filter((r) => r._status === "done" && r._result);
  for (const row of completedRows.slice(0, 10)) {
    if (row._result) {
      for (const key of Object.keys(row._result)) {
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
        const val = row._result?.[key];
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
