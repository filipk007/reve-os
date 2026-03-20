"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, CircleDot, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { FunctionOutput, SchemaIssue } from "@/lib/types";

interface OutputFieldsNodeProps {
  outputs: FunctionOutput[];
  editing: boolean;
  schemaIssues: SchemaIssue[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, field: keyof FunctionOutput, value: string) => void;
}

export function OutputFieldsNode({
  outputs,
  editing,
  schemaIssues,
  onAdd,
  onRemove,
  onUpdate,
}: OutputFieldsNodeProps) {
  const missingKeys = new Set(
    schemaIssues.filter((i) => i.type === "missing").map((i) => i.key)
  );

  return (
    <div className="relative shrink-0 w-48 md:w-56">
      <div className="rounded-lg border border-clay-600 bg-clay-800 overflow-hidden">
        <div className="px-3 py-2 border-b border-clay-700 flex items-center justify-between">
          <span className="text-xs font-medium text-clay-200">
            Outputs ({outputs.length})
          </span>
          {editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAdd}
              className="h-5 w-5 p-0 text-clay-300"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
          {outputs.length === 0 ? (
            <div className="text-[10px] text-clay-300 py-2 text-center">
              No outputs
            </div>
          ) : (
            outputs.map((out, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-clay-900/50 border border-clay-700 group"
              >
                {/* Port dot on left edge */}
                <CircleDot className="h-2.5 w-2.5 text-kiln-teal shrink-0 hidden md:block" />

                {editing ? (
                  <>
                    <Input
                      value={out.key}
                      onChange={(e) => onUpdate(i, "key", e.target.value)}
                      placeholder="key"
                      className="bg-clay-900 border-clay-600 text-clay-100 text-[10px] h-6 flex-1 px-1.5"
                    />
                    <Select value={out.type} onValueChange={(v) => onUpdate(i, "type", v)}>
                      <SelectTrigger size="sm" className="w-14 h-6 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["string", "number", "boolean", "json"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(i)}
                      className="h-5 w-5 p-0 text-red-400 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-[10px] font-medium text-kiln-teal truncate">
                        {out.key}
                      </span>
                      <span className="text-[9px] text-clay-300">
                        {out.type}
                      </span>
                    </div>
                    {missingKeys.has(out.key) ? (
                      <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    )}
                  </>
                )}
              </div>
            ))
          )}

          {/* Unmapped warnings */}
          {!editing &&
            schemaIssues
              .filter((i) => i.type === "unmapped")
              .map((issue) => (
                <div
                  key={issue.key}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/5 border border-amber-500/20"
                >
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                  <span className="text-[9px] text-amber-400 truncate">
                    {issue.key} (unmapped)
                  </span>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
