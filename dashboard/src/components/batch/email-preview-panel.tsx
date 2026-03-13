"use client";

import type { Job } from "@/lib/types";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";

function getConfidenceBadge(score: number): {
  label: string;
  className: string;
} {
  if (score >= 0.7) {
    return {
      label: `${(score * 100).toFixed(0)}% confidence`,
      className:
        "bg-status-success/15 text-status-success border border-status-success/30",
    };
  }
  if (score >= 0.4) {
    return {
      label: `${(score * 100).toFixed(0)}% confidence`,
      className:
        "bg-kiln-mustard/15 text-kiln-mustard border border-kiln-mustard/30",
    };
  }
  return {
    label: `${(score * 100).toFixed(0)}% confidence`,
    className: "bg-kiln-coral/15 text-kiln-coral border border-kiln-coral/30",
  };
}

export function EmailPreviewPanel({ job }: { job: Job }) {
  const isEmail =
    job.result &&
    ("subject_line" in job.result || "email_body" in job.result);

  const confidenceScore =
    typeof job.result?.confidence_score === "number"
      ? job.result.confidence_score
      : typeof job.result?.overall_confidence_score === "number"
        ? (job.result.overall_confidence_score as number)
        : undefined;

  const truncatedId =
    job.id.length > 16
      ? `${job.id.slice(0, 8)}...${job.id.slice(-4)}`
      : job.id;

  return (
    <div className="space-y-5 px-1">
      {/* Header section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={job.status} />
          {job.skill && (
            <span className="text-xs text-clay-200 bg-clay-700 px-2 py-0.5 rounded font-[family-name:var(--font-mono)]">
              {job.skill}
            </span>
          )}
          {job.duration_ms > 0 && (
            <span className="text-xs text-clay-300">
              {formatDuration(job.duration_ms)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-clay-300">
          <span className="font-[family-name:var(--font-mono)]">
            {truncatedId}
          </span>
          {job.created_at && (
            <span>{formatRelativeTime(job.created_at)}</span>
          )}
        </div>
      </div>

      {/* Confidence badge */}
      {confidenceScore !== undefined && (
        <div>
          <span
            className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${getConfidenceBadge(confidenceScore).className}`}
          >
            {getConfidenceBadge(confidenceScore).label}
          </span>
        </div>
      )}

      {/* Email preview section */}
      {isEmail && job.result && (
        <div className="space-y-4">
          {"subject_line" in job.result && job.result.subject_line != null && (
            <div>
              <p className="text-xs text-clay-200 uppercase tracking-wider mb-1.5">
                Subject
              </p>
              <div className="bg-clay-900 rounded-lg border border-clay-500 px-4 py-3">
                <p className="text-sm text-clay-100 font-medium">
                  {String(job.result.subject_line)}
                </p>
              </div>
            </div>
          )}

          {"email_body" in job.result && job.result.email_body != null && (
            <div>
              <p className="text-xs text-clay-200 uppercase tracking-wider mb-1.5">
                Body
              </p>
              <div className="bg-clay-900 rounded-lg border border-clay-500 px-4 py-3">
                <div className="text-sm text-clay-200 whitespace-pre-wrap leading-relaxed">
                  {String(job.result.email_body)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generic result section (non-email) */}
      {!isEmail && job.result && (
        <div>
          <p className="text-xs text-clay-200 uppercase tracking-wider mb-1.5">
            Result
          </p>
          <pre className="text-xs text-clay-300 font-[family-name:var(--font-mono)] max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-clay-900 p-4 border border-clay-500">
            {JSON.stringify(job.result, null, 2)}
          </pre>
        </div>
      )}

      {/* Error section */}
      {job.error && !job.result && (
        <div>
          <p className="text-xs text-clay-200 uppercase tracking-wider mb-1.5">
            Error
          </p>
          <div className="bg-kiln-coral/5 border border-kiln-coral/20 rounded-lg px-4 py-3">
            <p className="text-sm text-kiln-coral">{job.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
