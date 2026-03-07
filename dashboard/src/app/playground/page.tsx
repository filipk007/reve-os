"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { SkillSelector } from "@/components/playground/skill-selector";
import { JsonEditor } from "@/components/playground/json-editor";
import { ModelSelector } from "@/components/playground/model-selector";
import { ResultViewer } from "@/components/playground/result-viewer";
import { SKILL_SAMPLES, type Model } from "@/lib/constants";
import { runWebhook, fetchDestinations, pushToDestination } from "@/lib/api";
import type { Destination, WebhookResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { formatSmartDuration } from "@/lib/utils";

function PlaygroundInner() {
  const searchParams = useSearchParams();
  const [skill, setSkill] = useState("");
  const [json, setJson] = useState("{}");
  const [model, setModel] = useState<Model>("sonnet");
  const [result, setResult] = useState<WebhookResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [avgDurations, setAvgDurations] = useState<Record<string, number>>({});

  // Load destinations on mount
  useEffect(() => {
    fetchDestinations()
      .then((res) => setDestinations(res.destinations))
      .catch(() => {});
  }, []);

  // Handle skill from command palette URL param
  useEffect(() => {
    const s = searchParams.get("skill");
    if (s && SKILL_SAMPLES[s]) {
      setSkill(s);
      setJson(JSON.stringify(SKILL_SAMPLES[s], null, 2));
    }
  }, [searchParams]);

  // Detect client_slug from JSON data
  const clientSlug = (() => {
    try {
      const data = JSON.parse(json);
      return data.client_slug || null;
    } catch {
      return null;
    }
  })();

  const handleSkillChange = (s: string) => {
    setSkill(s);
    if (SKILL_SAMPLES[s]) {
      setJson(JSON.stringify(SKILL_SAMPLES[s], null, 2));
    }
    setResult(null);
  };

  const handleRun = async () => {
    if (!skill) return;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(json);
    } catch {
      toast.error("Invalid JSON", {
        description: "Fix your JSON data before running.",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await runWebhook({ skill, data, model });
      setResult(res);
      if (res.error) {
        toast.error("Webhook returned an error", {
          description: res.error_message || "Unknown error",
        });
      } else {
        const duration = res._meta?.duration_ms;
        toast.success("Webhook executed successfully", {
          description: duration ? `Completed in ${(duration / 1000).toFixed(1)}s` : undefined,
        });
        // Track avg duration per skill
        if (duration) {
          setAvgDurations((prev) => {
            const existing = prev[skill];
            const newAvg = existing
              ? Math.round((existing + duration) / 2)
              : duration;
            return { ...prev, [skill]: newAvg };
          });
        }
      }
    } catch (e) {
      const msg = (e as Error).message;
      setResult({ error: true, error_message: msg });
      toast.error("Failed to execute webhook", {
        description: msg,
        action: {
          label: "Retry",
          onClick: () => handleRun(),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTryAnother = () => {
    setResult(null);
  };

  // Keyboard shortcut: Cmd+Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (skill && !loading) handleRun();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [skill, loading, json, model]);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
        {/* Left: Input */}
        <div className="flex flex-col gap-4">
          <SkillSelector value={skill} onChange={handleSkillChange} />

          {/* Context indicators */}
          <div className="flex flex-wrap items-center gap-2">
            {clientSlug && (
              <Badge
                variant="outline"
                className="bg-kiln-teal/10 text-kiln-teal border-kiln-teal/30 text-xs"
              >
                <User className="h-3 w-3 mr-1" />
                Using context: {clientSlug}
              </Badge>
            )}
            {skill && avgDurations[skill] && (
              <Badge
                variant="outline"
                className="bg-clay-900/50 text-clay-400 border-clay-700 text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                ~{formatSmartDuration(avgDurations[skill])}
              </Badge>
            )}
          </div>

          <JsonEditor value={json} onChange={setJson} />
          <ModelSelector value={model} onChange={setModel} />

          <div className="flex gap-2">
            <Button
              onClick={handleRun}
              disabled={!skill || loading}
              className="flex-1 bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light font-semibold transition-all duration-200"
            >
              <Play className="h-4 w-4 mr-2" />
              {loading
                ? "Processing..."
                : skill
                  ? `Run with ${model.charAt(0).toUpperCase() + model.slice(1)}`
                  : "Run"}
              {!loading && (
                <kbd className="hidden md:inline-block ml-2 text-[10px] opacity-60 border border-kiln-teal-dark rounded px-1 py-0.5">
                  {"\u2318"}Enter
                </kbd>
              )}
            </Button>
            {result && !loading && (
              <Button
                variant="outline"
                onClick={handleTryAnother}
                className="border-clay-700 text-clay-400 hover:text-clay-200"
                title="Clear result and try again"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Right: Output */}
        <ResultViewer result={result} loading={loading} skill={skill} model={model} destinations={destinations} />
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Playground" />
      <Suspense>
        <PlaygroundInner />
      </Suspense>
    </div>
  );
}
