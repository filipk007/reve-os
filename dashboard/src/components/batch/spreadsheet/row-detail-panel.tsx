"use client";

import type { Job } from "@/lib/types";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/status-badge";

export function RowDetailPanel({
  job,
  originalData,
}: {
  job: Job;
  originalData: Record<string, string>;
}) {
  return (
    <div className="bg-clay-950 border-b border-clay-800 px-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Input data */}
        <div>
          <p className="text-xs text-clay-500 uppercase tracking-wider mb-2">
            Input Data
          </p>
          <div className="space-y-1">
            {Object.entries(originalData).length > 0 ? (
              Object.entries(originalData).map(([key, val]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="text-clay-500 font-[family-name:var(--font-mono)] shrink-0">
                    {key}:
                  </span>
                  <span className="text-clay-300 truncate">{val}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-clay-600">No input data</p>
            )}
          </div>
        </div>

        {/* Result JSON */}
        <div>
          <p className="text-xs text-clay-500 uppercase tracking-wider mb-2">
            Result
          </p>
          {job.result ? (
            <pre className="text-xs text-clay-300 font-[family-name:var(--font-mono)] max-h-48 overflow-auto whitespace-pre-wrap rounded bg-clay-900 p-2 border border-clay-800">
              {JSON.stringify(job.result, null, 2)}
            </pre>
          ) : job.error ? (
            <p className="text-xs text-kiln-coral">{job.error}</p>
          ) : (
            <p className="text-xs text-clay-600">Pending...</p>
          )}
        </div>

        {/* Meta */}
        <div>
          <p className="text-xs text-clay-500 uppercase tracking-wider mb-2">
            Metadata
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-clay-500">Status:</span>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-clay-500">Duration:</span>
              <span className="text-xs text-clay-300 font-[family-name:var(--font-mono)]">
                {job.duration_ms ? formatDuration(job.duration_ms) : "\u2014"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-clay-500">Job ID:</span>
              <span className="text-xs text-clay-400 font-[family-name:var(--font-mono)] truncate">
                {job.id}
              </span>
            </div>
            {job.row_id && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-clay-500">Row ID:</span>
                <span className="text-xs text-clay-400 font-[family-name:var(--font-mono)]">
                  {job.row_id}
                </span>
              </div>
            )}
            {job.created_at && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-clay-500">Created:</span>
                <span className="text-xs text-clay-400">
                  {formatRelativeTime(job.created_at)}
                </span>
              </div>
            )}
            {job.retry_count !== undefined && job.retry_count > 0 && (
              <Badge
                variant="outline"
                className="bg-kiln-mustard/10 text-kiln-mustard border-kiln-mustard/30 text-[10px] w-fit"
              >
                {job.retry_count} retries
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
