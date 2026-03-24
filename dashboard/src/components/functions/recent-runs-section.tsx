"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock, RotateCcw } from "lucide-react";
import { getRecentRuns } from "@/hooks/use-quick-run";

export function RecentRunsSection() {
  const router = useRouter();
  const [recents, setRecents] = useState<
    { funcId: string; funcName: string; timestamp: number; inputSummary: string }[]
  >([]);

  useEffect(() => {
    setRecents(getRecentRuns());
  }, []);

  if (recents.length === 0) return null;

  const displayRecents = recents.slice(0, 5);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-3.5 w-3.5 text-clay-300" />
        <h3 className="text-xs font-semibold text-clay-200 uppercase tracking-wider">
          Recent Runs
        </h3>
      </div>
      <div className="space-y-1">
        {displayRecents.map((run, i) => (
          <div
            key={`${run.funcId}-${i}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-clay-700/30 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-clay-100 truncate">
                  {run.funcName}
                </span>
                <span className="text-[10px] text-clay-300 shrink-0">
                  {formatRelativeTime(run.timestamp)}
                </span>
              </div>
              <p className="text-[11px] text-clay-300 truncate">
                {run.inputSummary}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/run/${run.funcId}`)}
              className="h-7 px-2 text-clay-300 hover:text-kiln-teal opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title="Run again"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
