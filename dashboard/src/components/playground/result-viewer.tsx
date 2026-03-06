"use client";

import { useState, useEffect } from "react";
import type { WebhookResponse } from "@/lib/types";
import { formatSmartDuration } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle, Loader2, Send, Sparkles, XCircle } from "lucide-react";

const STEPS = [
  { label: "Queued", icon: Send },
  { label: "Processing with Claude", icon: Sparkles },
  { label: "Formatting response", icon: Loader2 },
  { label: "Complete", icon: CheckCircle },
];

function ProgressSteps({ elapsed }: { elapsed: number }) {
  // Heuristic: estimate step based on elapsed time
  const step = elapsed < 500 ? 0 : elapsed < 2000 ? 1 : elapsed < 3000 ? 2 : 3;

  return (
    <div className="space-y-3 w-full max-w-xs">
      {STEPS.map((s, i) => {
        const active = i === step;
        const done = i < step;
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className={`flex items-center gap-3 transition-all duration-300 ${
              done
                ? "text-kiln-teal"
                : active
                  ? "text-kiln-teal"
                  : "text-clay-700"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${active ? "animate-pulse" : ""}`}
            />
            <span className="text-sm">{s.label}{i === 1 && elapsed > 500 ? "..." : ""}</span>
            {done && <CheckCircle className="h-3.5 w-3.5 ml-auto text-kiln-teal" />}
          </div>
        );
      })}
    </div>
  );
}

export function ResultViewer({
  result,
  loading,
  skill,
  model,
}: {
  result: WebhookResponse | null;
  loading: boolean;
  skill?: string;
  model?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 200);
    return () => clearInterval(id);
  }, [loading]);

  if (loading) {
    return (
      <Card className="border-clay-800 bg-clay-900 h-full">
        <CardContent className="flex h-full items-center justify-center">
          <ProgressSteps elapsed={elapsed} />
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex items-center">
        <EmptyState
          title="Ready to test"
          description="Pick a skill, tweak the data, and hit Run. Results appear here instantly."
          asset="/brand-assets/v2-playground.png"
        />
      </div>
    );
  }

  const meta = result._meta;
  const isError = result.error;
  const display = { ...result };
  delete display._meta;

  return (
    <Card className="border-clay-800 bg-clay-900 flex flex-col h-full overflow-hidden">
      {meta && (
        <CardHeader className="flex-row items-center gap-3 border-b border-clay-800 px-4 py-2.5 space-y-0">
          <Badge
            variant="outline"
            className="bg-kiln-teal/10 text-kiln-teal border-kiln-teal/30"
          >
            {meta.model}
          </Badge>
          <span className="text-xs text-clay-500">
            {formatSmartDuration(meta.duration_ms)}
          </span>
          {meta.cached && (
            <Badge
              variant="outline"
              className="bg-kiln-mustard/10 text-kiln-mustard border-kiln-mustard/30"
            >
              cached
            </Badge>
          )}
          {!isError && (
            <CheckCircle className="h-4 w-4 text-kiln-teal ml-auto" />
          )}
          {isError && (
            <XCircle className="h-4 w-4 text-kiln-coral ml-auto" />
          )}
        </CardHeader>
      )}
      <CardContent className="flex-1 overflow-auto p-0">
        <pre
          className={`p-4 font-[family-name:var(--font-mono)] text-sm leading-relaxed ${
            isError ? "text-kiln-coral" : "text-clay-200"
          }`}
        >
          {JSON.stringify(display, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
