"use client";

import type { SpreadsheetRow, SpreadsheetStatus } from "./types";
import { OutputRenderer } from "@/components/output/output-renderer";

const STATUS_STYLES: Record<SpreadsheetStatus, string> = {
  done: "bg-status-success/15 text-status-success",
  error: "bg-kiln-coral/15 text-kiln-coral",
  running: "bg-kiln-teal/15 text-kiln-teal",
  pending: "bg-clay-500/20 text-clay-200",
};

export function RowDetailPanel({ row }: { row: SpreadsheetRow }) {
  return (
    <div className="bg-clay-950 border-b border-clay-500 px-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Input data */}
        <div>
          <p className="text-xs text-clay-200 uppercase tracking-wider mb-2">
            Input Data
          </p>
          <div className="space-y-1">
            {Object.entries(row._original).length > 0 ? (
              Object.entries(row._original).map(([key, val]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="text-clay-200 font-[family-name:var(--font-mono)] shrink-0">
                    {key}:
                  </span>
                  <span className="text-clay-300 truncate">{val}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-clay-300">No input data</p>
            )}
          </div>
        </div>

        {/* Result / Error */}
        <div>
          <p className="text-xs text-clay-200 uppercase tracking-wider mb-2">
            {row._error ? "Error" : "Result"}
          </p>
          {row._result && typeof row._result === "object" ? (
            <div className="max-h-64 overflow-auto rounded bg-clay-800 p-2 border border-clay-500">
              <OutputRenderer result={row._result as Record<string, unknown>} />
            </div>
          ) : row._error ? (
            <pre className="text-xs text-kiln-coral font-[family-name:var(--font-mono)] max-h-48 overflow-auto whitespace-pre-wrap rounded bg-kiln-coral/5 p-2 border border-kiln-coral/30">
              {row._error}
            </pre>
          ) : (
            <p className="text-xs text-clay-300">Pending...</p>
          )}
        </div>

        {/* Status */}
        <div>
          <p className="text-xs text-clay-200 uppercase tracking-wider mb-2">
            Status
          </p>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[row._status]}`}
          >
            {row._status}
          </span>
        </div>
      </div>
    </div>
  );
}
