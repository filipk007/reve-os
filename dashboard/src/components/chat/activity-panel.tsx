"use client";

import { Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ExecutionTrace } from "./execution-trace";
import { ProgressBar } from "./progress-bar";
import type { ExecutionState, RowStatus } from "@/hooks/use-chat";

interface ActivityPanelProps {
  executionState: ExecutionState | null;
  rowStatuses: RowStatus[];
  streamProgress: { current: number; total: number } | null;
  completedResults: Record<string, unknown>[];
  streaming: boolean;
}

export function ActivityPanel({
  executionState,
  rowStatuses,
  streamProgress,
  completedResults,
  streaming,
}: ActivityPanelProps) {
  const isIdle =
    !streaming && completedResults.length === 0 && executionState === null;

  return (
    <div className="hidden lg:flex w-80 border-l border-clay-600 flex-col bg-clay-950 h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-clay-700 flex items-center gap-2">
        <Activity className="h-4 w-4 text-clay-300" />
        <span className="text-xs font-semibold text-clay-300">Activity</span>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ExecutionTrace
          executionState={executionState}
          hasResults={completedResults.length > 0}
        />
        <ProgressBar
          rowStatuses={rowStatuses}
          streamProgress={streamProgress}
        />

        {/* Results placeholder -- Plan 02 replaces with ResultsTable */}
        {completedResults.length > 0 && (
          <div className="flex-1 px-4 py-3 text-xs text-clay-300">
            {completedResults.length} result(s) ready
          </div>
        )}

        {/* Empty state when idle */}
        {isIdle && (
          <div className="flex-1 flex items-center justify-center p-6">
            <EmptyState
              title="Activity"
              description="Execution details will appear here when you run a function."
              icon={Activity}
            />
          </div>
        )}
      </div>
    </div>
  );
}
