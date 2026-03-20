"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type ColumnSizingState,
} from "@tanstack/react-table";
import type { SpreadsheetRow } from "./types";
import { buildColumns } from "./column-utils";

export function useSpreadsheet(
  rows: SpreadsheetRow[],
  inputHeaders: string[]
) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Persist selection across data refreshes using a ref keyed by row ID
  const selectionRef = useRef<Set<string>>(new Set());

  // Sync ref -> state when rows change (reconcile: keep IDs that still exist)
  useEffect(() => {
    const rowIds = new Set(rows.map((r) => r._id));
    for (const id of selectionRef.current) {
      if (!rowIds.has(id)) selectionRef.current.delete(id);
    }
    const newSelection: RowSelectionState = {};
    for (const id of selectionRef.current) {
      newSelection[id] = true;
    }
    setRowSelection(newSelection);
  }, [rows]);

  const handleRowSelectionChange = (
    updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)
  ) => {
    setRowSelection((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      selectionRef.current = new Set(Object.keys(next).filter((id) => next[id]));
      return next;
    });
  };

  const columns = useMemo(
    () => buildColumns(inputHeaders, rows),
    // Re-compute columns when result shape changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputHeaders, rows.filter((r) => r._status === "done").length > 0]
  );

  // Pre-filter by status
  const filteredData = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((row) => row._status === statusFilter);
  }, [rows, statusFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnSizing,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: handleRowSelectionChange,
    onColumnSizingChange: setColumnSizing,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getRowId: (row) => row._id,
  });

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const complete = rows.filter((r) => r._status === "done").length;
    const failed = rows.filter((r) => r._status === "error").length;
    const running = rows.filter(
      (r) => r._status === "running" || r._status === "pending"
    ).length;
    return { total, complete, failed, running };
  }, [rows]);

  // Selected row IDs
  const selectedRowIds = useMemo(() => {
    return Object.keys(rowSelection).filter((id) => rowSelection[id]);
  }, [rowSelection]);

  const selectAllFailed = () => {
    const newSelection: RowSelectionState = {};
    for (const row of filteredData) {
      if (row._status === "error") {
        newSelection[row._id] = true;
      }
    }
    selectionRef.current = new Set(Object.keys(newSelection));
    setRowSelection(newSelection);
  };

  const clearSelection = () => {
    selectionRef.current.clear();
    setRowSelection({});
  };

  return {
    table,
    stats,
    selectedRowIds,
    statusFilter,
    setStatusFilter,
    globalFilter,
    setGlobalFilter,
    selectAllFailed,
    clearSelection,
  };
}
