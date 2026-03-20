"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  FlaskConical,
  X,
  Eye,
  Code2,
  AlertTriangle,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FunctionInput, StepTrace, PreviewStep, ExecutionRecord } from "@/lib/types";
import { fetchExecutions } from "@/lib/api";
import { ExecutionTrace } from "./execution-trace";
import { ExecutionHistoryPanel } from "./execution-history";

interface FunctionPlaygroundProps {
  inputs: FunctionInput[];
  testInputs: Record<string, string>;
  setTestInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  testResult: Record<string, unknown> | null;
  testing: boolean;
  onRun: () => void;
  onClose: () => void;
  // Preview support (Phase 4)
  preview: {
    steps: PreviewStep[];
    unresolved_variables: string[];
    summary: Record<string, number>;
  } | null;
  previewing: boolean;
  onPreview: () => void;
  // Streaming support
  streamingTrace?: StepTrace[];
  // Execution history
  functionId?: string;
}

const EXECUTOR_BADGE: Record<string, { label: string; color: string }> = {
  native_api: {
    label: "Native API",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  skill: {
    label: "Skill",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  call_ai: {
    label: "AI Analysis",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  ai_agent: {
    label: "AI Agent",
    color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  ai_single: {
    label: "AI Single",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  ai_fallback: {
    label: "AI Fallback",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
};

export function FunctionPlayground({
  inputs,
  testInputs,
  setTestInputs,
  testResult,
  testing,
  onRun,
  onClose,
  preview,
  previewing,
  onPreview,
  streamingTrace,
  functionId,
}: FunctionPlaygroundProps) {
  const [activeTab, setActiveTab] = useState<"trace" | "raw" | "history">("trace");

  // Extract trace from test result _meta
  const meta = testResult?._meta as Record<string, unknown> | undefined;
  const trace = meta?.trace as StepTrace[] | undefined;
  const totalDurationMs = (meta?.duration_ms as number) || 0;
  const stepsTotal = (meta?.steps as number) || 0;
  const hasTrace = trace && trace.length > 0;

  // Extract warnings — from _warnings field or auto-detect null outputs
  const rawWarnings = testResult?._warnings as string[] | undefined;
  const warnings: string[] = rawWarnings ? [...rawWarnings] : [];
  if (testResult && !rawWarnings) {
    const nullKeys = Object.entries(testResult)
      .filter(([k, v]) => v === null && !k.startsWith("_"))
      .map(([k]) => k);
    if (nullKeys.length > 0) {
      warnings.push(`${nullKeys.length} output field${nullKeys.length > 1 ? "s" : ""} returned null: ${nullKeys.join(", ")}`);
    }
  }

  return (
    <Card className="border-clay-600 border-kiln-teal/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-clay-200 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-kiln-teal" />
            Quick Test
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-clay-400 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {inputs.length === 0 ? (
          <div className="text-xs text-clay-500">
            No inputs defined — will run with empty data.
          </div>
        ) : (
          <div className="space-y-2">
            {inputs.map((inp) => (
              <div key={inp.name}>
                <label className="text-[10px] text-clay-400 mb-0.5 block">
                  {inp.name}{" "}
                  <span className="text-clay-600">({inp.type})</span>
                  {inp.required && (
                    <span className="text-red-400 ml-1">*</span>
                  )}
                </label>
                <Input
                  value={testInputs[inp.name] || ""}
                  onChange={(e) =>
                    setTestInputs((prev) => ({
                      ...prev,
                      [inp.name]: e.target.value,
                    }))
                  }
                  placeholder={`Enter ${inp.name}...`}
                  className="bg-clay-900 border-clay-600 text-clay-100 text-xs h-7"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onPreview}
            disabled={previewing || testing}
            variant="outline"
            className="border-clay-600 text-clay-300 hover:text-clay-100"
          >
            <Eye className="h-3 w-3 mr-1" />
            {previewing ? "..." : "Preview"}
          </Button>
          <Button
            size="sm"
            onClick={onRun}
            disabled={testing}
            className="bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light"
          >
            <Play className="h-3 w-3 mr-1" />
            {testing ? "Running..." : "Run"}
          </Button>
          {testResult && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTestInputs({});
              }}
              className="text-clay-400 text-xs"
            >
              Clear
            </Button>
          )}
          <span className="text-[10px] text-clay-500 ml-auto">
            <kbd className="px-1 py-0.5 rounded bg-clay-800 border border-clay-600 text-[9px]">
              {"\u2318"}+Enter
            </kbd>{" "}
            to run
          </span>
        </div>

        {/* Preview panel */}
        {preview && !testResult && (
          <div className="space-y-2">
            <div className="text-[10px] text-clay-500 font-medium uppercase tracking-wide">
              Execution Preview
            </div>
            {preview.unresolved_variables.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Unresolved: {preview.unresolved_variables.join(", ")}
              </div>
            )}
            <div className="space-y-1.5">
              {preview.steps.map((step) => {
                const badge = EXECUTOR_BADGE[step.executor] || EXECUTOR_BADGE.ai_fallback;
                return (
                  <div
                    key={step.step_index}
                    className="flex items-center gap-2 p-2 rounded bg-clay-900/50 border border-clay-700"
                  >
                    <span className="text-[10px] text-clay-500 w-4">
                      {step.step_index + 1}
                    </span>
                    <span className="text-xs text-clay-100 font-medium truncate">
                      {step.tool_name || step.tool}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1.5 py-0 h-4 shrink-0 border",
                        badge.color
                      )}
                    >
                      {badge.label}
                    </Badge>
                    {step.unresolved_variables.length > 0 && (
                      <span className="text-[10px] text-amber-400 ml-auto">
                        {step.unresolved_variables.length} unresolved
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Summary counts */}
            <div className="flex items-center gap-2 text-[10px] text-clay-500">
              {Object.entries(preview.summary).map(([key, val]) => (
                <span key={key}>
                  {val}x {key.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Live streaming trace (during execution) */}
        {testing && streamingTrace && streamingTrace.length > 0 && !testResult && (
          <ExecutionTrace
            trace={streamingTrace}
            totalDurationMs={0}
            stepsTotal={stepsTotal || streamingTrace.length + 1}
            isStreaming
          />
        )}

        {/* Test result */}
        {testResult && (
          <div className="space-y-2">
            {/* Tab toggle: Trace / Raw JSON / History */}
            <div className="flex items-center gap-1">
              {hasTrace && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("trace")}
                  className={cn(
                    "h-6 text-[10px] px-2",
                    activeTab === "trace"
                      ? "text-kiln-teal bg-kiln-teal/10"
                      : "text-clay-400"
                  )}
                >
                  Trace
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("raw")}
                className={cn(
                  "h-6 text-[10px] px-2",
                  activeTab === "raw"
                    ? "text-kiln-teal bg-kiln-teal/10"
                    : "text-clay-400"
                )}
              >
                <Code2 className="h-3 w-3 mr-1" />
                Raw JSON
              </Button>
              {functionId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "h-6 text-[10px] px-2",
                    activeTab === "history"
                      ? "text-kiln-teal bg-kiln-teal/10"
                      : "text-clay-400"
                  )}
                >
                  <History className="h-3 w-3 mr-1" />
                  History
                </Button>
              )}
            </div>

            {activeTab === "trace" && hasTrace ? (
              <ExecutionTrace
                trace={trace}
                totalDurationMs={totalDurationMs}
                stepsTotal={stepsTotal}
                warnings={warnings.length > 0 ? warnings : undefined}
              />
            ) : activeTab === "history" && functionId ? (
              <ExecutionHistoryPanel functionId={functionId} />
            ) : (
              <pre className="text-[11px] text-clay-300 bg-clay-900 p-3 rounded border border-clay-700 overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* History tab when no result yet */}
        {!testResult && !testing && !preview && functionId && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(activeTab === "history" ? "trace" : "history")}
              className={cn(
                "h-6 text-[10px] px-2",
                activeTab === "history"
                  ? "text-kiln-teal bg-kiln-teal/10"
                  : "text-clay-400"
              )}
            >
              <History className="h-3 w-3 mr-1" />
              Past Runs
            </Button>
            {activeTab === "history" && (
              <ExecutionHistoryPanel functionId={functionId} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
