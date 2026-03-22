"use client";

import { Zap, CheckCircle2 } from "lucide-react";
import type { ExecutionState } from "@/hooks/use-chat";

interface ExecutionTraceProps {
  executionState: ExecutionState | null;
  hasResults: boolean;
}

export function ExecutionTrace({
  executionState,
  hasResults,
}: ExecutionTraceProps) {
  if (executionState) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-clay-700">
        <Zap className="h-4 w-4 text-kiln-teal" />
        <span className="text-sm font-semibold text-clay-100">
          {executionState.functionName}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-clay-300">
          Running...
          <span className="animate-pulse bg-kiln-teal rounded-full h-1.5 w-1.5 inline-block" />
        </span>
      </div>
    );
  }

  if (hasResults) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-clay-700">
        <CheckCircle2 className="h-4 w-4 text-status-success" />
        <span className="text-sm font-semibold text-clay-100">Complete</span>
      </div>
    );
  }

  return null;
}
