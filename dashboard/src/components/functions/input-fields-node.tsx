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
import { Plus, Trash2, CircleDot } from "lucide-react";
import type { FunctionInput } from "@/lib/types";

interface InputFieldsNodeProps {
  inputs: FunctionInput[];
  editing: boolean;
  inputUsageMap: Record<string, number[]>;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, field: keyof FunctionInput, value: string | boolean) => void;
}

export function InputFieldsNode({
  inputs,
  editing,
  inputUsageMap,
  onAdd,
  onRemove,
  onUpdate,
}: InputFieldsNodeProps) {
  return (
    <div className="relative shrink-0 w-48 md:w-56">
      <div className="rounded-lg border border-clay-600 bg-clay-800 overflow-hidden">
        <div className="px-3 py-2 border-b border-clay-700 flex items-center justify-between">
          <span className="text-xs font-medium text-clay-200">
            Inputs ({inputs.length})
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
          {inputs.length === 0 ? (
            <div className="text-[10px] text-clay-300 py-2 text-center">
              No inputs
            </div>
          ) : (
            inputs.map((inp, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-clay-900/50 border border-clay-700 group"
              >
                {editing ? (
                  <>
                    <Input
                      value={inp.name}
                      onChange={(e) => onUpdate(i, "name", e.target.value)}
                      placeholder="name"
                      className="bg-clay-900 border-clay-600 text-clay-100 text-[10px] h-6 flex-1 px-1.5"
                    />
                    <Select value={inp.type} onValueChange={(v) => onUpdate(i, "type", v)}>
                      <SelectTrigger size="sm" className="w-14 h-6 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["string", "number", "url", "email", "boolean"].map((t) => (
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
                      <span className="text-[10px] font-medium text-clay-100 truncate">
                        {inp.name}
                      </span>
                      <span className="text-[9px] text-clay-300">
                        {inp.type}
                      </span>
                      {inp.required && (
                        <span className="text-[8px] text-red-400">*</span>
                      )}
                    </div>
                    {inputUsageMap[inp.name] ? (
                      <Badge
                        variant="secondary"
                        className="text-[8px] px-1 py-0 h-3.5 shrink-0"
                      >
                        {inputUsageMap[inp.name].length} use{inputUsageMap[inp.name].length !== 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Badge
                        variant="destructive"
                        className="text-[8px] px-1 py-0 h-3.5 shrink-0"
                      >
                        unused
                      </Badge>
                    )}
                  </>
                )}
                {/* Port dot on right edge */}
                <CircleDot className="h-2.5 w-2.5 text-kiln-teal shrink-0 hidden md:block" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
