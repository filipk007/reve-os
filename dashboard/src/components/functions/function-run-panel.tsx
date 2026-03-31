"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Play,
  Clipboard,
  Terminal,
  ClipboardPaste,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Clock,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FunctionDefinition, FunctionInput, StepTrace } from "@/lib/types";
import { OutputRenderer } from "@/components/output/output-renderer";
import { ExecutionTrace } from "./execution-trace";
import { ExecutionHistoryPanel } from "./execution-history";
import {
  prepareConsolidatedPrompt,
  queueLocalJob,
  submitLocalResult,
  fetchLocalJob,
  streamFunctionExecution,
} from "@/lib/api";

interface FunctionRunPanelProps {
  func: FunctionDefinition;
  inputs: FunctionInput[];
}

export function FunctionRunPanel({ func, inputs }: FunctionRunPanelProps) {
  // Input state
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const testInputsRef = useRef<Record<string, string>>({});
  testInputsRef.current = testInputs;

  // Execution state
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [streamingTrace, setStreamingTrace] = useState<StepTrace[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Local execution state
  const [copyingPrompt, setCopyingPrompt] = useState(false);
  const [localJobId, setLocalJobId] = useState<string | null>(null);
  const [localWaiting, setLocalWaiting] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedJson, setPastedJson] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState<"output" | "trace" | "raw" | "history">("output");
  const [copied, setCopied] = useState(false);

  // Auto-switch to output when result arrives
  useEffect(() => {
    if (result) setActiveTab("output");
  }, [result]);

  // Poll for local job completion
  useEffect(() => {
    if (!localJobId || !localWaiting) return;
    const interval = setInterval(async () => {
      try {
        const job = await fetchLocalJob(localJobId);
        if (job.status === "completed" || job.status === "failed") {
          setLocalWaiting(false);
          if (job.status === "completed") {
            toast.success("Local execution complete — check History tab");
            setActiveTab("history");
          } else {
            toast.error("Local execution failed");
          }
          clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [localJobId, localWaiting]);

  // Keyboard shortcut: Cmd+Enter to run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !running) {
        e.preventDefault();
        handleRunServer();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, func]);

  // ── Handlers ──────────────────────────────────────────

  const handleRunServer = () => {
    abortRef.current?.abort();
    setRunning(true);
    setResult(null);
    setStreamingTrace([]);

    abortRef.current = streamFunctionExecution(
      func.id,
      testInputsRef.current,
      (trace) => setStreamingTrace((prev) => [...prev, trace]),
      (res) => { setResult(res); setRunning(false); },
      (err) => { setResult({ error: true, message: err }); setRunning(false); },
    );
  };

  const handleCopyPrompt = async () => {
    setCopyingPrompt(true);
    try {
      const res = await prepareConsolidatedPrompt(func.id, testInputs);
      await navigator.clipboard.writeText(res.prompt);
      toast.success(`Prompt copied (${(res.prompt.length / 1000).toFixed(1)}k chars) — paste into Claude Code`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to copy prompt");
    } finally {
      setCopyingPrompt(false);
    }
  };

  const handleRunLocally = async () => {
    setLocalWaiting(true);
    try {
      const job = await queueLocalJob(func.id, testInputs);
      setLocalJobId(job.job_id);
      setPasteMode(true);
      toast.success("Job queued — run clay-run --watch or paste result below");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to queue job");
      setLocalWaiting(false);
    }
  };

  const handleSubmitPasted = async () => {
    if (!localJobId) return;
    try {
      const parsed = JSON.parse(pastedJson);
      const response = await submitLocalResult(func.id, localJobId, parsed);
      toast.success(`Result saved: ${response.exec_id}`);
      setResult(parsed);
      setPasteMode(false);
      setPastedJson("");
      setLocalJobId(null);
      setLocalWaiting(false);
    } catch (e) {
      if (e instanceof SyntaxError) {
        toast.error("Invalid JSON — check your pasted result");
      } else {
        toast.error(e instanceof Error ? e.message : "Failed to submit result");
      }
    }
  };

  const handleCopyResult = async () => {
    if (!cleanOutput) return;
    await navigator.clipboard.writeText(JSON.stringify(cleanOutput, null, 2));
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Derived state ─────────────────────────────────────

  const meta = result?._meta as Record<string, unknown> | undefined;
  const trace = meta?.trace as StepTrace[] | undefined;
  const totalDurationMs = (meta?.duration_ms as number) || 0;
  const hasTrace = trace && trace.length > 0;
  const hasError = result?.error === true;

  const cleanOutput = result
    ? Object.fromEntries(Object.entries(result).filter(([k]) => !k.startsWith("_")))
    : null;
  const fieldCount = cleanOutput ? Object.keys(cleanOutput).length : 0;
  const nullCount = cleanOutput
    ? Object.values(cleanOutput).filter((v) => v === null).length
    : 0;

  const rawWarnings = result?._warnings as string[] | undefined;
  const warnings: string[] = rawWarnings ? [...rawWarnings] : [];
  if (result && !rawWarnings) {
    const nullKeys = Object.entries(result)
      .filter(([k, v]) => v === null && !k.startsWith("_"))
      .map(([k]) => k);
    if (nullKeys.length > 0) {
      warnings.push(`${nullKeys.length} field${nullKeys.length > 1 ? "s" : ""} returned null: ${nullKeys.join(", ")}`);
    }
  }

  const hasResult = result !== null;
  const isStreaming = running && streamingTrace.length > 0;

  return (
    <Card className="border-clay-700 bg-clay-900/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-clay-200 flex items-center gap-2">
          <Play className="h-4 w-4 text-kiln-teal" />
          Run
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inputs */}
        {inputs.length > 0 && (
          <div className="space-y-2.5">
            {inputs.map((inp) => (
              <div key={inp.name}>
                <label className="text-xs text-clay-400 mb-1 block">
                  {inp.name}{" "}
                  <span className="text-clay-600">({inp.type})</span>
                  {inp.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                <Input
                  value={testInputs[inp.name] || ""}
                  onChange={(e) =>
                    setTestInputs((prev) => ({ ...prev, [inp.name]: e.target.value }))
                  }
                  placeholder={inp.description || `Enter ${inp.name}...`}
                  className="bg-clay-900 border-clay-700 text-clay-100 text-sm h-9"
                />
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleRunServer}
            disabled={running}
            className="bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light"
            size="sm"
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5" />
            )}
            {running ? "Running..." : "Run"}
          </Button>

          <div className="h-5 w-px bg-clay-700" />

          <Button
            onClick={handleCopyPrompt}
            disabled={copyingPrompt}
            variant="outline"
            size="sm"
            className="border-clay-700 text-clay-400 hover:text-clay-100"
            title="Copy assembled prompt to clipboard — paste into Claude Code"
          >
            <Clipboard className="h-3.5 w-3.5 mr-1.5" />
            {copyingPrompt ? "Copying..." : "Copy Prompt"}
          </Button>

          <Button
            onClick={handleRunLocally}
            disabled={localWaiting}
            variant="outline"
            size="sm"
            className="border-clay-700 text-clay-400 hover:text-clay-100"
            title="Queue for local execution via clay-run CLI"
          >
            <Terminal className="h-3.5 w-3.5 mr-1.5" />
            {localWaiting ? "Queued..." : "Run Locally"}
          </Button>

          <span className="text-[10px] text-clay-600 ml-auto hidden sm:block">
            <kbd className="px-1 py-0.5 rounded bg-clay-800 border border-clay-700 text-[10px]">
              {"\u2318"}+Enter
            </kbd>{" "}
            to run
          </span>
        </div>

        {/* Paste Result panel */}
        {pasteMode && localJobId && (
          <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span className="font-medium">Paste Result from Claude Code</span>
              {localWaiting && (
                <span className="flex items-center gap-1 ml-auto text-clay-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Waiting for clay-run...
                </span>
              )}
            </div>
            <textarea
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder='{"field": "value", ...}'
              className="w-full h-24 bg-clay-900 border border-clay-700 rounded text-xs text-clay-200 p-2 font-mono resize-y focus:outline-none focus:border-amber-500/50"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSubmitPasted}
                disabled={!pastedJson.trim()}
                size="sm"
                className="bg-amber-600 text-white hover:bg-amber-500 h-7 text-xs"
              >
                Submit Result
              </Button>
              <Button
                onClick={() => {
                  setPasteMode(false);
                  setPastedJson("");
                  setLocalJobId(null);
                  setLocalWaiting(false);
                }}
                variant="ghost"
                size="sm"
                className="text-clay-500 h-7 text-xs"
              >
                Cancel
              </Button>
              <span className="text-[10px] text-clay-600 ml-auto font-mono">
                {localJobId}
              </span>
            </div>
          </div>
        )}

        {/* Streaming progress */}
        {isStreaming && (
          <div className="space-y-1.5">
            <div className="text-xs text-clay-500 font-medium uppercase tracking-wide flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-kiln-teal" />
              Executing ({streamingTrace.length} step{streamingTrace.length !== 1 ? "s" : ""} complete)
            </div>
            <div className="w-full bg-clay-800 rounded-full h-1.5">
              <div
                className="bg-kiln-teal h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((streamingTrace.length / Math.max(func.steps.length, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {hasResult && (
          <div className="space-y-3">
            {/* Metrics badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  hasError
                    ? "border-red-500/30 text-red-400"
                    : "border-emerald-500/30 text-emerald-400"
                )}
              >
                {hasError ? (
                  <XCircle className="h-3 w-3 mr-1" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                )}
                {hasError ? "Error" : "Success"}
              </Badge>
              {fieldCount > 0 && (
                <Badge variant="outline" className="text-[10px] border-clay-600 text-clay-400">
                  <Zap className="h-3 w-3 mr-1" />
                  {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                  {nullCount > 0 && ` (${nullCount} null)`}
                </Badge>
              )}
              {totalDurationMs > 0 && (
                <Badge variant="outline" className="text-[10px] border-clay-600 text-clay-400">
                  <Clock className="h-3 w-3 mr-1" />
                  {(totalDurationMs / 1000).toFixed(1)}s
                </Badge>
              )}
              <button onClick={handleCopyResult} className="ml-auto text-clay-500 hover:text-clay-300">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded p-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div>{warnings.join("; ")}</div>
              </div>
            )}

            {/* Tabs: Output / Trace / Raw / History */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="bg-clay-800/50 h-8">
                <TabsTrigger value="output" className="text-xs h-6 data-[state=active]:bg-clay-700">
                  Output
                </TabsTrigger>
                {hasTrace && (
                  <TabsTrigger value="trace" className="text-xs h-6 data-[state=active]:bg-clay-700">
                    Trace
                  </TabsTrigger>
                )}
                <TabsTrigger value="raw" className="text-xs h-6 data-[state=active]:bg-clay-700">
                  Raw
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs h-6 data-[state=active]:bg-clay-700">
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="output" className="mt-2">
                {cleanOutput && <OutputRenderer result={cleanOutput} />}
              </TabsContent>

              {hasTrace && (
                <TabsContent value="trace" className="mt-2">
                  <ExecutionTrace trace={trace} totalDurationMs={totalDurationMs} stepsTotal={func.steps.length} />
                </TabsContent>
              )}

              <TabsContent value="raw" className="mt-2">
                <pre className="text-xs text-clay-300 bg-clay-900 rounded p-3 overflow-auto max-h-80 font-mono">
                  {JSON.stringify(cleanOutput, null, 2)}
                </pre>
              </TabsContent>

              <TabsContent value="history" className="mt-2">
                <ExecutionHistoryPanel functionId={func.id} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Show history tab when no result yet */}
        {!hasResult && !isStreaming && !pasteMode && (
          <ExecutionHistoryPanel functionId={func.id} />
        )}
      </CardContent>
    </Card>
  );
}
