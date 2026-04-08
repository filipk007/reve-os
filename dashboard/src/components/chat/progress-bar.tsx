"use client";

import { Circle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { RowStatus, RowStatusValue } from "@/hooks/use-chat";

interface ProgressBarProps {
  rowStatuses: RowStatus[];
  streamProgress: { current: number; total: number } | null;
}

const statusIcons: Record<
  RowStatusValue,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  pending: { icon: Circle, className: "h-3 w-3 text-clay-300" },
  running: { icon: Loader2, className: "h-3 w-3 text-kiln-teal animate-spin" },
  done: { icon: CheckCircle2, className: "h-3 w-3 text-status-success" },
  error: { icon: XCircle, className: "h-3 w-3 text-kiln-coral" },
};

export function ProgressBar({ rowStatuses }: ProgressBarProps) {
  if (rowStatuses.length === 0) return null;

  const total = rowStatuses.length;
  const completed = rowStatuses.filter(
    (r) => r.status === "done" || r.status === "error"
  ).length;
  const hasErrors = rowStatuses.some((r) => r.status === "error");
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Progress text */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-clay-300">Progress</span>
        <span className="text-xs text-clay-300 font-mono tabular-nums">
          {completed}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-clay-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            hasErrors ? "bg-kiln-mustard" : "bg-kiln-teal"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Row status list */}
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {rowStatuses.map((row) => {
          const { icon: StatusIcon, className: iconClass } =
            statusIcons[row.status];
          return (
            <div
              key={row.index}
              className="flex items-center gap-2 text-xs py-0.5"
            >
              <StatusIcon className={iconClass} />
              <span className="text-clay-200">
                Row {row.index + 1}
                {row.error && (
                  <span className="text-kiln-coral">
                    {" "}
                    -- {row.error.length > 40
                      ? `${row.error.slice(0, 40)}...`
                      : row.error}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
