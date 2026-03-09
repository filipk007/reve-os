"use client";

import { cn } from "@/lib/utils";
import {
  Mail,
  Clock,
  Cpu,
  ChevronDown,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WebhookResponse } from "@/lib/types";
import type { EmailLabRun } from "@/lib/email-lab-constants";
import { useState } from "react";

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmailPreviewPanel({
  result,
  loading,
  error,
  history,
  onRestore,
  onClearHistory,
}: {
  result: WebhookResponse | null;
  loading: boolean;
  error: string | null;
  history: EmailLabRun[];
  onRestore: (run: EmailLabRun) => void;
  onClearHistory: () => void;
}) {
  const [metaOpen, setMetaOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Extract email fields
  const subject =
    (result?.subject as string) ||
    (result?.subject_line as string) ||
    (result?.email_subject as string) ||
    "";
  const body =
    (result?.body as string) ||
    (result?.email_body as string) ||
    (result?.email as string) ||
    "";
  const cta =
    (result?.cta as string) ||
    (result?.call_to_action as string) ||
    "";

  // Metadata fields
  const meta = result?._meta;
  const angle = result?.angle_used as string | undefined;
  const angleReasoning = result?.angle_reasoning as string | undefined;
  const frameworkNotes = result?.framework_notes as string | undefined;
  const confidence = result?.confidence_score as number | undefined;

  const handleCopy = () => {
    const text = subject
      ? `Subject: ${subject}\n\n${body}${cta ? `\n\n${cta}` : ""}`
      : JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Preview section */}
      <div className="flex-1 p-3 space-y-3 min-h-0 overflow-y-auto">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {loading && !result && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-clay-300">
            <div className="h-8 w-8 rounded-full border-2 border-kiln-teal border-t-transparent animate-spin" />
            <p className="text-sm">Generating email...</p>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-clay-300">
            <Mail className="h-8 w-8 text-clay-500" />
            <p className="text-sm text-clay-300">
              Select a template and run to preview
            </p>
          </div>
        )}

        {result && (
          <>
            {/* Mail chrome */}
            <div className="rounded-xl border border-clay-700 overflow-hidden">
              {/* Mail header */}
              <div className="bg-clay-800/80 px-4 py-3 border-b border-clay-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-kiln-teal/15 flex items-center justify-center">
                      <Mail className="h-3.5 w-3.5 text-kiln-teal" />
                    </div>
                    <span className="text-xs text-clay-300">New Email</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 text-xs text-clay-300 hover:text-clay-100"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                {subject && (
                  <p className="text-sm font-medium text-clay-100 pl-9">
                    {subject}
                  </p>
                )}
              </div>

              {/* Mail body */}
              <div className="px-4 py-4">
                {body ? (
                  <p className="text-sm text-clay-200 whitespace-pre-wrap leading-relaxed">
                    {body}
                  </p>
                ) : (
                  <pre className="text-xs text-clay-200 font-[family-name:var(--font-mono)] overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>

              {/* CTA */}
              {cta && (
                <div className="mx-4 mb-4 rounded-md bg-kiln-teal/10 border border-kiln-teal/20 px-3 py-2">
                  <p className="text-[10px] text-clay-300 uppercase tracking-wider mb-0.5">
                    Call to Action
                  </p>
                  <p className="text-sm font-medium text-kiln-teal">{cta}</p>
                </div>
              )}
            </div>

            {/* Quick metadata chips */}
            <div className="flex flex-wrap gap-2">
              {angle && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-kiln-teal/10 text-kiln-teal border border-kiln-teal/20">
                  {angle}
                </span>
              )}
              {confidence !== undefined && (
                <span
                  className={cn(
                    "text-[11px] px-2 py-1 rounded-full border",
                    confidence >= 0.8
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : confidence >= 0.5
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                  )}
                >
                  {(confidence * 100).toFixed(0)}% confidence
                </span>
              )}
              {meta && (
                <>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-clay-700/50 text-clay-300 flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    {meta.model}
                  </span>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-clay-700/50 text-clay-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(meta.duration_ms)}
                  </span>
                </>
              )}
            </div>

            {/* Collapsible metadata */}
            {(angleReasoning || frameworkNotes || meta) && (
              <button
                onClick={() => setMetaOpen(!metaOpen)}
                className="flex items-center gap-1.5 text-xs text-clay-300 hover:text-clay-200 transition-colors"
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    metaOpen && "rotate-180"
                  )}
                />
                Details
              </button>
            )}

            {metaOpen && (
              <div className="rounded-lg border border-clay-700 bg-clay-800/30 p-3 space-y-2 text-xs">
                {angleReasoning && (
                  <div>
                    <p className="text-clay-300 font-medium mb-0.5">
                      Angle Reasoning
                    </p>
                    <p className="text-clay-200">{angleReasoning}</p>
                  </div>
                )}
                {frameworkNotes && (
                  <div>
                    <p className="text-clay-300 font-medium mb-0.5">
                      Framework Notes
                    </p>
                    <p className="text-clay-200">{frameworkNotes}</p>
                  </div>
                )}
                {meta && (
                  <div className="flex gap-4 text-clay-300 pt-1 border-t border-clay-700">
                    {meta.input_tokens_est && (
                      <span>In: ~{meta.input_tokens_est.toLocaleString()} tok</span>
                    )}
                    {meta.output_tokens_est && (
                      <span>Out: ~{meta.output_tokens_est.toLocaleString()} tok</span>
                    )}
                    {meta.cached && (
                      <span className="text-kiln-teal">Cached</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* History section */}
      {history.length > 0 && (
        <div className="border-t border-clay-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-semibold text-clay-300 uppercase tracking-[0.1em]">
              History
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearHistory}
              className="h-6 text-[10px] text-clay-300 hover:text-red-400 px-1.5"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {history.slice(0, 10).map((run) => (
              <button
                key={run.id}
                onClick={() => onRestore(run)}
                className="w-full text-left px-2.5 py-1.5 rounded-md text-xs hover:bg-clay-700/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-clay-200 truncate">
                    {(run.data.company_name as string) || run.skill}
                  </span>
                  <span className="text-[10px] text-clay-300 shrink-0 ml-2">
                    {formatDuration(run.durationMs)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-clay-300">
                  <span>{run.skill}</span>
                  <span>&middot;</span>
                  <span>{run.model}</span>
                  <span>&middot;</span>
                  <span>{formatTime(run.timestamp)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
