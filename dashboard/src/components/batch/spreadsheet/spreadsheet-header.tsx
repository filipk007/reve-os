"use client";

import type { Header, flexRender } from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SpreadsheetRow } from "./column-utils";

export function SpreadsheetHeaderCell({
  header,
}: {
  header: Header<SpreadsheetRow, unknown>;
}) {
  const canSort = header.column.getCanSort();
  const sorted = header.column.getIsSorted();
  const canResize = header.column.getCanResize();

  return (
    <th
      key={header.id}
      className="relative px-3 py-2 text-left text-xs font-medium text-clay-200 uppercase tracking-wider bg-clay-800 border-b border-clay-500 select-none whitespace-nowrap"
      style={{ width: header.getSize(), minWidth: header.getSize() }}
    >
      <div
        className={`flex items-center gap-1 ${canSort ? "cursor-pointer hover:text-clay-300" : ""}`}
        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
      >
        {header.isPlaceholder
          ? null
          : typeof header.column.columnDef.header === "string"
            ? header.column.columnDef.header
            : header.column.columnDef.header?.toString()}
        {canSort && (
          <span className="ml-auto">
            {sorted === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : sorted === "desc" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-40" />
            )}
          </span>
        )}
      </div>
      {/* Resize handle */}
      {canResize && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-kiln-teal/50 active:bg-kiln-teal"
        />
      )}
    </th>
  );
}
