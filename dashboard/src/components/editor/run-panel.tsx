"use client";

import { useState } from "react";
import { runWebhook } from "@/lib/api";
import type { WebhookResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Play, Loader2 } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { toast } from "sonner";

export function RunPanel({ skill }: { skill: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const [input, setInput] = useState(
    JSON.stringify({ first_name: "Sarah", company_name: "Acme" }, null, 2)
  );
  const [result, setResult] = useState<WebhookResponse | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(input);
    } catch {
      toast.error("Invalid JSON");
      return;
    }

    setRunning(true);
    setResult(null);
    try {
      const res = await runWebhook({ skill, data });
      setResult(res);
      if (res.error) {
        toast.error("Error", { description: res.error_message });
      }
    } catch (e) {
      toast.error("Run failed", { description: (e as Error).message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="border-t border-clay-800 bg-clay-950">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-clay-500 hover:text-clay-300 transition-colors"
      >
        <span className="uppercase tracking-wider font-medium">Run Panel</span>
        {collapsed ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-clay-600 uppercase tracking-wider mb-1 block">
                JSON Input
              </label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="h-32 font-[family-name:var(--font-mono)] text-xs border-clay-700 bg-clay-900 text-clay-200 resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-clay-600 uppercase tracking-wider mb-1 block">
                Result
              </label>
              {result ? (
                <div className="space-y-1">
                  {result._meta && (
                    <Badge
                      variant="outline"
                      className="bg-kiln-teal/10 text-kiln-teal border-kiln-teal/30 text-[10px]"
                    >
                      {formatDuration(result._meta.duration_ms)}
                    </Badge>
                  )}
                  <pre className="h-28 overflow-auto text-xs text-clay-300 font-[family-name:var(--font-mono)] whitespace-pre-wrap rounded bg-clay-900 p-2 border border-clay-800">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center rounded border border-clay-800 bg-clay-900">
                  <span className="text-xs text-clay-600">
                    {running ? "Running..." : "Run to see results"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={handleRun}
            disabled={running || !skill}
            size="sm"
            className="bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light font-semibold"
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5" />
            )}
            Run
          </Button>
        </div>
      )}
    </div>
  );
}
