"use client";

import { useState } from "react";
import type { FunctionDefinition } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FunctionInfoPanelProps {
  func: FunctionDefinition;
}

export function FunctionInfoPanel({ func }: FunctionInfoPanelProps) {
  const requiredInputs = func.inputs.filter((i) => i.required);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const isOpen = (key: string) => !!openSections[key];

  return (
    <Card className="bg-clay-900/50 border-clay-700">
      <CardContent className="p-4 space-y-3">
        {/* Description */}
        {func.description && (
          <p className="text-sm text-clay-200">{func.description}</p>
        )}

        {/* Compact stat bar */}
        <div className="flex items-center gap-3 text-xs text-clay-400">
          <span>
            <span className="text-clay-100 font-medium">{requiredInputs.length}</span>
            {" required / "}
            <span className="text-clay-100 font-medium">{func.inputs.length}</span>
            {" inputs"}
          </span>
          <span className="text-clay-600">·</span>
          <span>
            <span className="text-clay-100 font-medium">{func.outputs.length}</span>
            {" outputs"}
          </span>
          <span className="text-clay-600">·</span>
          <span>
            <span className="text-clay-100 font-medium">{func.steps.length}</span>
            {" steps"}
          </span>
          {func.folder && (
            <>
              <span className="text-clay-600">·</span>
              <span className="text-clay-300">{func.folder}</span>
            </>
          )}
        </div>

        {/* Inputs — collapsible */}
        {func.inputs.length > 0 && (
          <CollapsibleSection
            label={`Inputs (${func.inputs.length})`}
            isOpen={isOpen("inputs")}
            onToggle={() => toggle("inputs")}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-clay-700">
                    <th className="text-left py-1.5 pr-3 text-clay-400 font-medium">
                      Field
                    </th>
                    <th className="text-left py-1.5 pr-3 text-clay-400 font-medium">
                      Type
                    </th>
                    <th className="text-left py-1.5 pr-3 text-clay-400 font-medium">
                      Required
                    </th>
                    <th className="text-left py-1.5 text-clay-400 font-medium">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {func.inputs.map((input) => (
                    <tr
                      key={input.name}
                      className="border-b border-clay-700/50"
                    >
                      <td className="py-1.5 pr-3 font-mono text-clay-100">
                        {input.name}
                      </td>
                      <td className="py-1.5 pr-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {input.type}
                        </Badge>
                      </td>
                      <td className="py-1.5 pr-3">
                        {input.required ? (
                          <Badge className="text-[10px] bg-kiln-teal/15 text-kiln-teal border-kiln-teal/25">
                            required
                          </Badge>
                        ) : (
                          <span className="text-clay-500">optional</span>
                        )}
                      </td>
                      <td className="py-1.5 text-clay-300">
                        {input.description || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        )}

        {/* Outputs — collapsible */}
        {func.outputs.length > 0 && (
          <CollapsibleSection
            label={`Outputs (${func.outputs.length})`}
            isOpen={isOpen("outputs")}
            onToggle={() => toggle("outputs")}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-clay-700">
                    <th className="text-left py-1.5 pr-3 text-clay-400 font-medium">
                      Key
                    </th>
                    <th className="text-left py-1.5 pr-3 text-clay-400 font-medium">
                      Type
                    </th>
                    <th className="text-left py-1.5 text-clay-400 font-medium">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {func.outputs.map((output) => (
                    <tr
                      key={output.key}
                      className="border-b border-clay-700/50"
                    >
                      <td className="py-1.5 pr-3 font-mono text-kiln-teal">
                        {output.key}
                      </td>
                      <td className="py-1.5 pr-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {output.type}
                        </Badge>
                      </td>
                      <td className="py-1.5 text-clay-300">
                        {output.description || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        )}

        {/* Pipeline — horizontal flow, collapsible */}
        {func.steps.length > 0 && (
          <CollapsibleSection
            label={`Pipeline (${func.steps.length})`}
            isOpen={isOpen("pipeline")}
            onToggle={() => toggle("pipeline")}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              {func.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="flex items-center gap-2 bg-clay-800 border border-clay-700 rounded-lg px-2.5 py-1.5">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-clay-900 border border-clay-600 text-[9px] font-bold text-kiln-teal shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-clay-100">
                        {formatToolName(step.tool)}
                      </span>
                      {Object.keys(step.params).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {Object.entries(step.params).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[9px] text-clay-500 bg-clay-900 rounded px-1 py-px"
                            >
                              {k}={v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {i < func.steps.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-clay-600 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Collapsible section ────────────────────────────────── */

function CollapsibleSection({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-clay-700/50 pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 w-full group"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-clay-500 transition-transform",
            !isOpen && "-rotate-90"
          )}
        />
        <h4 className="text-xs font-medium text-clay-400 uppercase tracking-wider group-hover:text-clay-300 transition-colors">
          {label}
        </h4>
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────── */

function formatToolName(tool: string): string {
  if (tool.startsWith("skill:")) return tool;
  return tool
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
