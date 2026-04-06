"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  ClipboardCheck,
  X,
  RefreshCw,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutionSummaryData, ColumnProgress } from "@/hooks/use-table-builder";
import type { TableDefinition } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

interface ExecutionSummaryProps {
  summary: ExecutionSummaryData;
  table: TableDefinition;
  columnProgress: Record<string, ColumnProgress>;
  onDismiss: () => void;
  onExport?: () => void;
  onSendToReview?: () => void;
  onRetryFailed?: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = Math.round(secs % 60);
  return `${mins}m ${remSecs}s`;
}

export function ExecutionSummary({
  summary,
  table,
  columnProgress,
  onDismiss,
  onExport,
  onSendToReview,
  onRetryFailed,
}: ExecutionSummaryProps) {
  const totalCells = summary.cellsDone + summary.cellsErrored;
  const successRate = totalCells > 0 ? (summary.cellsDone / totalCells) * 100 : 0;
  const isGreatResult = successRate >= 90;

  // Get enrichment columns for per-column breakdown
  const enrichmentCols = table.columns.filter(
    (c) => c.column_type !== "input" && c.column_type !== "static" && !c.hidden
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4 pointer-events-none"
      >
        {/* Backdrop — click to dismiss */}
        <div
          className="absolute inset-0 bg-black/40 pointer-events-auto"
          onClick={onDismiss}
        />

        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative pointer-events-auto w-full max-w-lg"
        >
          <Card className="border-clay-600 bg-clay-800 shadow-2xl shadow-black/40">
            <CardContent className="p-5">
              {/* Close button */}
              <button
                onClick={onDismiss}
                className="absolute top-3 right-3 text-clay-400 hover:text-clay-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Status header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-xl",
                    isGreatResult
                      ? "bg-emerald-500/10 text-emerald-400"
                      : summary.cellsErrored > 0
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-kiln-teal/10 text-kiln-teal"
                  )}
                >
                  {isGreatResult ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-clay-100">
                    {summary.halted ? "Execution halted" : "Execution complete"}
                  </h3>
                  <p className="text-xs text-clay-300">
                    {table.name}
                  </p>
                </div>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-clay-700/50 px-3 py-2 text-center">
                  <div className="text-lg font-bold text-clay-100">
                    {summary.cellsDone}
                  </div>
                  <div className="text-[10px] text-clay-400 uppercase tracking-wider">
                    Succeeded
                  </div>
                </div>
                <div className="rounded-lg bg-clay-700/50 px-3 py-2 text-center">
                  <div className={cn(
                    "text-lg font-bold",
                    summary.cellsErrored > 0 ? "text-red-400" : "text-clay-100"
                  )}>
                    {summary.cellsErrored}
                  </div>
                  <div className="text-[10px] text-clay-400 uppercase tracking-wider">
                    Errors
                  </div>
                </div>
                <div className="rounded-lg bg-clay-700/50 px-3 py-2 text-center">
                  <div className="text-lg font-bold text-clay-100 flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-clay-300" />
                    {formatDuration(summary.totalDurationMs)}
                  </div>
                  <div className="text-[10px] text-clay-400 uppercase tracking-wider">
                    Duration
                  </div>
                </div>
              </div>

              {/* Success rate bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-clay-300">Success rate</span>
                  <span className={cn(
                    "text-xs font-semibold",
                    isGreatResult ? "text-emerald-400" : "text-amber-400"
                  )}>
                    {successRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-clay-700 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isGreatResult ? "bg-emerald-500" : "bg-amber-500"
                    )}
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>

              {/* Per-column breakdown (if multiple enrichment columns) */}
              {enrichmentCols.length > 1 && (
                <div className="mb-4 space-y-1.5">
                  <p className="text-[10px] text-clay-400 uppercase tracking-wider mb-1">
                    Per column
                  </p>
                  {enrichmentCols.map((col) => {
                    const prog = columnProgress[col.id];
                    if (!prog) return null;
                    const colRate = prog.total > 0
                      ? ((prog.done / prog.total) * 100).toFixed(0)
                      : "–";
                    return (
                      <div key={col.id} className="flex items-center gap-2 text-xs">
                        <span className="text-clay-200 truncate flex-1">{col.name}</span>
                        <span className="text-clay-400 shrink-0">
                          {prog.done}/{prog.total}
                        </span>
                        {prog.errors > 0 && (
                          <span className="text-red-400 shrink-0">
                            {prog.errors} err
                          </span>
                        )}
                        <span className={cn(
                          "text-[10px] font-medium shrink-0 w-8 text-right",
                          Number(colRate) >= 90 ? "text-emerald-400" : "text-amber-400"
                        )}>
                          {colRate}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {onExport && (
                  <Button
                    size="sm"
                    className="bg-kiln-teal text-black hover:bg-kiln-teal/90 flex-1"
                    onClick={onExport}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export CSV
                  </Button>
                )}
                {onSendToReview && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-clay-600 text-clay-200 hover:bg-clay-700 flex-1"
                    onClick={onSendToReview}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                    Send to Review
                  </Button>
                )}
                {summary.cellsErrored > 0 && onRetryFailed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={onRetryFailed}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Retry failed
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
