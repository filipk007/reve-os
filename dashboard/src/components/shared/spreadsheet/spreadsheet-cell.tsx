"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SpreadsheetStatus } from "./types";

const STATUS_STYLES: Record<SpreadsheetStatus, string> = {
  done: "bg-status-success/15 text-status-success",
  error: "bg-kiln-coral/15 text-kiln-coral",
  running: "bg-kiln-teal/15 text-kiln-teal",
  pending: "bg-clay-500/20 text-clay-200",
};

const STATUS_LABELS: Record<SpreadsheetStatus, string> = {
  done: "Done",
  error: "Error",
  running: "Running",
  pending: "Pending",
};

export function SpreadsheetCell({
  columnId,
  value,
}: {
  columnId: string;
  value: unknown;
}) {
  // Checkbox column
  if (columnId === "select") {
    if (!value || typeof value !== "object") return null;
    const v = value as { checked: boolean; onChange: (e: unknown) => void };
    return (
      <input
        type="checkbox"
        checked={v.checked}
        onChange={v.onChange}
        className="h-3.5 w-3.5 rounded border-clay-600 bg-clay-800 text-kiln-teal focus:ring-kiln-teal/50 cursor-pointer"
      />
    );
  }

  // Index column
  if (columnId === "_index") {
    return (
      <span className="text-clay-200 font-[family-name:var(--font-mono)] text-xs">
        {String(value)}
      </span>
    );
  }

  // Status column
  if (columnId === "_status") {
    const status = value as SpreadsheetStatus;
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLES[status] || "text-clay-300"}`}
      >
        {status === "running" && (
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
        )}
        {STATUS_LABELS[status] || status}
      </span>
    );
  }

  // Generic cell with tooltip for truncated content
  const strValue = value === null || value === undefined ? "" : String(value);
  if (!strValue) {
    return <span className="text-clay-300">{"\u2014"}</span>;
  }

  const isTruncated = strValue.length > 60;

  if (isTruncated) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-clay-300 block truncate max-w-full cursor-default">
              {strValue}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="max-w-sm bg-clay-800 border-clay-700 text-clay-200 text-xs"
          >
            <pre className="whitespace-pre-wrap font-[family-name:var(--font-mono)]">
              {strValue}
            </pre>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <span className="text-xs text-clay-300 block truncate">{strValue}</span>
  );
}
