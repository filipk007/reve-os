"use client";

import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Papa from "papaparse";
import type { SpreadsheetRow } from "./types";
import { useSpreadsheet } from "./use-spreadsheet";
import { SpreadsheetToolbar } from "./spreadsheet-toolbar";
import { SpreadsheetHeaderCell } from "./spreadsheet-header";
import { SpreadsheetRowComponent } from "./spreadsheet-row";
import { SpreadsheetFooter } from "./spreadsheet-footer";

export function SpreadsheetView({
  rows,
  inputHeaders,
  onRetrySelected,
  onNewRun,
}: {
  rows: SpreadsheetRow[];
  inputHeaders: string[];
  onRetrySelected?: (rowIds: string[]) => void;
  onNewRun?: () => void;
}) {
  const {
    table,
    stats,
    selectedRowIds,
    statusFilter,
    setStatusFilter,
    globalFilter,
    setGlobalFilter,
    selectAllFailed,
    clearSelection,
  } = useSpreadsheet(rows, inputHeaders);

  const parentRef = useRef<HTMLDivElement>(null);

  const { rows: tableRows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 15,
  });

  const downloadCsv = useCallback(() => {
    const csvRows = rows.map((row) => {
      const result = row._result || {};
      return {
        ...row._original,
        _status: row._status,
        _error: row._error || "",
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
    a.download = `results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  const exportSelected = useCallback(() => {
    const selected = rows.filter((r) => selectedRowIds.includes(r._id));
    const csvRows = selected.map((row) => {
      const result = row._result || {};
      return {
        ...row._original,
        _status: row._status,
        _error: row._error || "",
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
    a.download = `results-selected-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, selectedRowIds]);

  return (
    <div className="rounded-xl border border-clay-500 overflow-hidden">
      <SpreadsheetToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        selectedCount={selectedRowIds.length}
        failedCount={stats.failed}
        onRetrySelected={
          onRetrySelected && selectedRowIds.length > 0
            ? () => onRetrySelected(selectedRowIds)
            : undefined
        }
        onExportSelected={selectedRowIds.length > 0 ? exportSelected : undefined}
        onSelectAllFailed={stats.failed > 0 ? selectAllFailed : undefined}
        onClearSelection={clearSelection}
        onDownloadAll={downloadCsv}
        totalRows={stats.total}
        completedCount={stats.complete}
      />

      <div ref={parentRef} className="overflow-auto max-h-[600px]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <SpreadsheetHeaderCell key={header.id} header={header} />
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {virtualizer.getVirtualItems().length === 0 ? (
              <tr>
                <td
                  colSpan={table.getHeaderGroups()[0]?.headers.length || 1}
                  className="text-center py-12 text-sm text-clay-200"
                >
                  No matching rows
                </td>
              </tr>
            ) : (
              virtualizer.getVirtualItems().map((virtualRow) => {
                const row = tableRows[virtualRow.index];
                if (!row) return null;
                return (
                  <SpreadsheetRowComponent key={row.id} row={row} />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <SpreadsheetFooter
        total={stats.total}
        complete={stats.complete}
        failed={stats.failed}
        running={stats.running}
      />
    </div>
  );
}
