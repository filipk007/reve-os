"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Globe,
  Bot,
} from "lucide-react";
import type {
  FunctionStep,
  FunctionOutput,
  ToolDefinition,
  SchemaIssue,
  CostEstimate,
} from "@/lib/types";

interface LivePreviewContentProps {
  steps: FunctionStep[];
  outputs: FunctionOutput[];
  toolMap: Record<string, ToolDefinition>;
  testInputs: Record<string, string>;
  schemaIssues: SchemaIssue[];
  costEstimate: CostEstimate;
}

export function LivePreviewContent({
  steps,
  outputs,
  toolMap,
  testInputs,
  schemaIssues,
  costEstimate,
}: LivePreviewContentProps) {
  // Resolve template vars with test inputs
  const resolvedSteps = useMemo(() => {
    return steps.map((step, i) => {
      const toolDef = toolMap[step.tool];
      const resolvedParams: Record<string, { raw: string; resolved: string; hasUnresolved: boolean }> = {};

      Object.entries(step.params || {}).forEach(([key, val]) => {
        let resolved = val;
        let hasUnresolved = false;

        resolved = val.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
          if (testInputs[varName] !== undefined && testInputs[varName] !== "") {
            return testInputs[varName];
          }
          hasUnresolved = true;
          return match;
        });

        resolvedParams[key] = { raw: val, resolved, hasUnresolved };
      });

      return {
        index: i,
        tool: step.tool,
        toolName: toolDef?.name || step.tool,
        resolvedParams,
        unresolvedCount: Object.values(resolvedParams).filter((p) => p.hasUnresolved).length,
      };
    });
  }, [steps, toolMap, testInputs]);

  const totalUnresolved = resolvedSteps.reduce(
    (sum, s) => sum + s.unresolvedCount,
    0
  );
  const missingOutputs = schemaIssues.filter((i) => i.type === "missing");
  const unmappedOutputs = schemaIssues.filter((i) => i.type === "unmapped");

  return (
    <div className="space-y-4">
      {/* a) Resolved Template View */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-clay-200">
            Resolved Template
          </span>
          {totalUnresolved > 0 && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 text-amber-400 border-amber-500/30"
            >
              {totalUnresolved} unresolved
            </Badge>
          )}
        </div>

        {steps.length === 0 ? (
          <div className="text-[10px] text-clay-300 py-2">
            Add steps to see preview
          </div>
        ) : (
          <div className="space-y-2">
            {resolvedSteps.map((step) => (
              <div
                key={step.index}
                className="rounded bg-clay-900/50 border border-clay-700 p-2"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] text-clay-300">
                    {step.index + 1}.
                  </span>
                  <span className="text-[10px] font-medium text-clay-100">
                    {step.toolName}
                  </span>
                  {step.unresolvedCount > 0 && (
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                  )}
                </div>
                <div className="space-y-0.5">
                  {Object.entries(step.resolvedParams).map(([key, p]) => (
                    <div
                      key={key}
                      className="flex items-baseline gap-1 text-[10px]"
                    >
                      <span className="text-clay-300 font-mono shrink-0">
                        {key}:
                      </span>
                      <span
                        className={
                          p.hasUnresolved ? "text-amber-400" : "text-clay-200"
                        }
                      >
                        {p.resolved || (
                          <span className="text-clay-300 italic">empty</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* b) Schema Validation */}
      <div>
        <span className="text-xs font-medium text-clay-200 block mb-2">
          Output Coverage
        </span>

        {outputs.length === 0 ? (
          <div className="text-[10px] text-clay-300 py-1">
            No outputs defined
          </div>
        ) : (
          <div className="space-y-1">
            {outputs.map((out) => {
              const isMissing = missingOutputs.some(
                (i) => i.key === out.key
              );
              return (
                <div
                  key={out.key}
                  className="flex items-center gap-1.5 text-[10px]"
                >
                  {isMissing ? (
                    <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                  )}
                  <span
                    className={
                      isMissing
                        ? "text-red-400 font-medium"
                        : "text-clay-200"
                    }
                  >
                    {out.key}
                  </span>
                  <span className="text-clay-300">({out.type})</span>
                </div>
              );
            })}

            {unmappedOutputs.map((issue) => (
              <div
                key={issue.key}
                className="flex items-center gap-1.5 text-[10px]"
              >
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                <span className="text-amber-400">{issue.key}</span>
                <span className="text-clay-300">(unmapped)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* c) Cost Estimate */}
      <div>
        <span className="text-xs font-medium text-clay-200 block mb-2">
          Estimated Cost
        </span>

        {steps.length === 0 ? (
          <div className="text-[10px] text-clay-300">No steps</div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {costEstimate.apiCalls > 0 && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 text-emerald-400 border-emerald-500/30"
                >
                  <Globe className="h-2.5 w-2.5 mr-0.5" />
                  {costEstimate.apiCalls} API call{costEstimate.apiCalls !== 1 ? "s" : ""}
                </Badge>
              )}
              {costEstimate.aiCalls > 0 && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 text-amber-400 border-amber-500/30"
                >
                  <Bot className="h-2.5 w-2.5 mr-0.5" />
                  {costEstimate.aiCalls} AI call{costEstimate.aiCalls !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <div className="space-y-0.5">
              {costEstimate.breakdown.map((line, i) => (
                <div
                  key={i}
                  className="text-[10px] text-clay-300 flex items-center gap-1"
                >
                  <Zap className="h-2.5 w-2.5 shrink-0" />
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
