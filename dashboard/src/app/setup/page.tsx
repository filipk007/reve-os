"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Circle, Loader2, Terminal, Copy, ExternalLink, Zap, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLocalRunnerStatus } from "@/lib/api";

const INSTALL_COMMAND = `bash ~/Documents/clay-webhook-os/scripts/install-daemon.sh`;
const REMOVE_COMMAND = `bash ~/Documents/clay-webhook-os/scripts/install-daemon.sh --remove`;
const MANUAL_COMMAND = `cd ~/Documents/clay-webhook-os && python3.11 scripts/clay-run.py --watch`;

export default function SetupPage() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const status = await getLocalRunnerStatus();
      setConnected(status.connected);
    } catch {
      setConnected(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const CopyBlock = ({ command, field, hint }: { command: string; field: string; hint?: string }) => (
    <div className="space-y-1.5 w-full">
      <div
        onClick={() => handleCopy(command, field)}
        className="flex items-center gap-2 bg-clay-900 border border-clay-700 rounded-lg px-4 py-3 cursor-pointer hover:border-clay-600 transition-colors group"
      >
        <code className="text-xs text-kiln-teal font-mono flex-1 break-all select-all">
          {command}
        </code>
        <button className="shrink-0 text-clay-500 group-hover:text-clay-300 transition-colors">
          {copiedField === field ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-[10px] text-clay-500">{hint}</p>}
    </div>
  );

  const steps = [
    {
      title: "Install Claude Code",
      description: "The AI engine that powers enrichments. Download and sign in with your Claude account.",
      action: (
        <Button variant="outline" size="sm" className="h-7 border-clay-600 text-clay-300" asChild>
          <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 mr-1" />Download
          </a>
        </Button>
      ),
      hint: "Already have it? Skip to step 2.",
    },
    {
      title: "Start the local runner",
      description: mode === "auto"
        ? "One command installs the runner as a background service. It auto-starts when your Mac boots — no terminal window needed."
        : "Run this in Terminal. Keep the window open while you work.",
      action: (
        <div className="space-y-3 w-full">
          {/* Mode toggle */}
          <div className="flex gap-1 bg-clay-800 rounded-lg p-0.5 w-fit">
            <button
              onClick={() => setMode("auto")}
              className={cn(
                "px-3 py-1 rounded-md text-[11px] font-medium transition-colors",
                mode === "auto" ? "bg-clay-700 text-clay-100" : "text-clay-400 hover:text-clay-300",
              )}
            >
              <Download className="h-3 w-3 inline mr-1" />Auto-start
            </button>
            <button
              onClick={() => setMode("manual")}
              className={cn(
                "px-3 py-1 rounded-md text-[11px] font-medium transition-colors",
                mode === "manual" ? "bg-clay-700 text-clay-100" : "text-clay-400 hover:text-clay-300",
              )}
            >
              <Terminal className="h-3 w-3 inline mr-1" />Manual
            </button>
          </div>

          {mode === "auto" ? (
            <>
              <CopyBlock
                command={INSTALL_COMMAND}
                field="install"
                hint="Click to copy. Paste in Terminal — runs once, then it's hands-free forever."
              />
              {connected && (
                <CopyBlock
                  command={REMOVE_COMMAND}
                  field="remove"
                  hint="To uninstall the background service."
                />
              )}
            </>
          ) : (
            <CopyBlock
              command={MANUAL_COMMAND}
              field="manual"
              hint="Click to copy. Keep this terminal open while enriching."
            />
          )}
        </div>
      ),
    },
    {
      title: "You're all set",
      description: connected
        ? "Connected and ready. Enrichments run locally on your Mac — no API keys needed."
        : "Waiting for the runner to connect — usually takes a few seconds after step 2.",
      action: connected ? (
        <div className="flex gap-2">
          <Button size="sm" className="h-8 bg-kiln-teal text-black hover:bg-kiln-teal/90" asChild>
            <a href="/tables">
              <Zap className="h-3.5 w-3.5 mr-1" />Open Tables
            </a>
          </Button>
          <Button size="sm" variant="outline" className="h-8 border-clay-600 text-clay-300" asChild>
            <a href="/enrich">
              Start Enriching
            </a>
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-7 border-clay-600 text-clay-300" onClick={checkStatus} disabled={checking}>
          {checking ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Circle className="h-3 w-3 mr-1" />}
          Check again
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-12 px-6">
        <div className="max-w-lg mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Terminal className="h-6 w-6 text-kiln-teal" />
            </div>
            <h1 className="text-xl font-semibold text-clay-100">Set up local runner</h1>
            <p className="text-sm text-clay-400 max-w-sm mx-auto">
              Enrichments run on your Mac using your Claude subscription. No API keys, no per-call billing.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-1">
            {steps.map((step, i) => {
              const isDone = i === 2 ? connected === true : i < 2;

              return (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors",
                      i === 2 && connected === true
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-clay-600 bg-clay-800",
                    )}>
                      {i === 2 && connected === true ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <span className="text-xs font-semibold text-clay-300">{i + 1}</span>
                      )}
                    </div>
                    {i < steps.length - 1 && <div className="w-px flex-1 bg-clay-700 my-1" />}
                  </div>

                  <div className="pb-8 flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-clay-100 mb-1">{step.title}</h3>
                    <p className="text-xs text-clay-400 mb-3 leading-relaxed">{step.description}</p>
                    {step.action}
                    {step.hint && <p className="text-[10px] text-clay-500 mt-2">{step.hint}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status card */}
          <div className={cn(
            "rounded-lg border px-4 py-3 flex items-center gap-3",
            connected === true
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-clay-700 bg-clay-800/50",
          )}>
            <div className={cn(
              "h-2.5 w-2.5 rounded-full shrink-0",
              connected === true ? "bg-emerald-500" : connected === false ? "bg-red-500 animate-pulse" : "bg-clay-500",
            )} />
            <div className="flex-1">
              <span className={cn("text-sm", connected === true ? "text-emerald-300" : "text-clay-300")}>
                {connected === true
                  ? "Connected"
                  : connected === false
                    ? "Not connected"
                    : "Checking..."}
              </span>
            </div>
            {connected === true && (
              <span className="text-[10px] text-clay-500">Runner active</span>
            )}
          </div>

          {/* How it works */}
          <div className="border border-clay-700 rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold text-clay-300 uppercase tracking-wider">How it works</h3>
            <div className="space-y-1.5 text-xs text-clay-400">
              <p>The local runner connects your Mac to the dashboard. When you run a table:</p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>Dashboard sends column config to the server</li>
                <li>Server queues enrichment jobs for your runner</li>
                <li>Runner calls Deepline CLI (865+ real API tools) or Claude</li>
                <li>Results stream back to your table in real-time</li>
              </ol>
              <p className="text-clay-500 pt-1">
                {mode === "auto"
                  ? "Auto-start mode installs a background service that runs whenever your Mac is on."
                  : "Manual mode requires keeping a terminal open. Good for testing."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
