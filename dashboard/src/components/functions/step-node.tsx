"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  GripVertical,
  Trash2,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FunctionStep, ToolDefinition, VariableInfo } from "@/lib/types";
import { ToolPicker } from "./tool-picker";
import { VariableAutocomplete } from "./variable-autocomplete";
import type { ToolCategory } from "@/lib/types";

interface StepNodeProps {
  step: FunctionStep;
  index: number;
  total: number;
  id: string;
  editing: boolean;
  toolDef: ToolDefinition | undefined;
  toolCategories: ToolCategory[];
  availableVars: VariableInfo[];
  wiredInputs: string[];
  isExpanded: boolean;
  isEditingParams: boolean;
  onToggleExpand: () => void;
  onToggleParamEdit: () => void;
  onUpdateTool: (tool: string) => void;
  onUpdateParam: (key: string, value: string, oldKey?: string) => void;
  onRemoveParam: (key: string) => void;
  onAddParam: () => void;
  onRemove: () => void;
}

/** Highlight {{vars}} with resolved/unresolved colors */
function highlightVars(value: string, availableVarNames: Set<string>) {
  const parts = value.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{\{(.+)\}\}$/);
    if (match) {
      const varName = match[1];
      const resolved = availableVarNames.has(varName);
      return (
        <span
          key={i}
          className={cn(
            "px-1 rounded text-[10px] font-medium",
            resolved
              ? "text-kiln-teal bg-kiln-teal/10"
              : "text-red-400 bg-red-400/10"
          )}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function ExecutorBadge({ toolDef }: { toolDef: ToolDefinition }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] px-1.5 py-0 h-4 shrink-0 border",
        toolDef.has_native_api
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : toolDef.execution_mode === "ai_agent"
            ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
            : "bg-amber-500/15 text-amber-400 border-amber-500/30"
      )}
    >
      {toolDef.has_native_api
        ? `API`
        : toolDef.execution_mode === "ai_agent"
          ? "Agent"
          : "AI"}
    </Badge>
  );
}

export function StepNode({
  step,
  index,
  total,
  id,
  editing,
  toolDef,
  toolCategories,
  availableVars,
  wiredInputs,
  isExpanded,
  isEditingParams,
  onToggleExpand,
  onToggleParamEdit,
  onUpdateTool,
  onUpdateParam,
  onRemoveParam,
  onAddParam,
  onRemove,
}: StepNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasParams = step.params && Object.keys(step.params).length > 0;
  const availableVarNames = new Set(availableVars.map((v) => v.name));
  const [toolPickerOpen, setToolPickerOpen] = useState(false);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "shrink-0 w-56 md:w-64 rounded-lg border bg-clay-800 overflow-hidden",
        isDragging
          ? "border-kiln-teal shadow-lg shadow-kiln-teal/10 opacity-50"
          : "border-clay-600"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-clay-700">
        {/* Port dot left */}
        <CircleDot className="h-2.5 w-2.5 text-kiln-teal shrink-0 hidden md:block" />

        {editing && (
          <button
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-clay-300 hover:text-clay-200 shrink-0"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}

        <span className="text-[10px] text-clay-300 shrink-0">
          {index + 1}
        </span>

        {editing ? (
          <div className="flex-1 min-w-0 relative">
            <ToolPicker
              open={toolPickerOpen}
              onOpenChange={setToolPickerOpen}
              toolCategories={toolCategories}
              currentTool={step.tool}
              toolDef={toolDef}
              onSelect={(toolId) => {
                onUpdateTool(toolId);
                setToolPickerOpen(false);
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {toolDef ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs font-medium text-clay-100 truncate border-b border-dotted border-clay-500 cursor-help">
                    {toolDef.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1">
                    <div className="font-medium">{toolDef.name}</div>
                    <div className="text-clay-300 text-[10px]">
                      {toolDef.category} &middot; {step.tool}
                    </div>
                    {toolDef.description && (
                      <div className="text-clay-300 text-[10px]">
                        {toolDef.description}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <span className="text-xs font-medium text-clay-100 truncate">
                {step.tool || "No tool"}
              </span>
            )}
          </div>
        )}

        {toolDef && <ExecutorBadge toolDef={toolDef} />}

        {editing && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleParamEdit}
              className={cn(
                "h-5 w-5 p-0",
                isEditingParams ? "text-kiln-teal" : "text-clay-300"
              )}
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-5 w-5 p-0 text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}

        {!editing && hasParams && (
          <button
            onClick={onToggleExpand}
            className="text-clay-300 hover:text-clay-200 shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}

        {/* Port dot right */}
        <CircleDot className="h-2.5 w-2.5 text-kiln-teal shrink-0 hidden md:block" />
      </div>

      {/* Wired inputs badges */}
      {!editing && wiredInputs.length > 0 && (
        <div className="px-2 py-1 flex flex-wrap gap-1 border-b border-clay-700/50">
          {wiredInputs.map((name) => (
            <Badge
              key={name}
              variant="outline"
              className="text-[8px] px-1 py-0 h-3.5 text-kiln-teal border-kiln-teal/30"
            >
              {`{{${name}}}`}
            </Badge>
          ))}
        </div>
      )}

      {/* Read-only params view */}
      <AnimatePresence>
        {!editing && isExpanded && hasParams && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 space-y-1">
              {Object.entries(step.params).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-baseline gap-1.5 text-[10px]"
                >
                  <span className="text-clay-300 font-mono shrink-0">
                    {key}
                  </span>
                  <span className="text-clay-300">=</span>
                  <span className="text-clay-200 break-all leading-relaxed">
                    {highlightVars(val, availableVarNames)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit mode param editor */}
      <AnimatePresence>
        {isEditingParams && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 space-y-2 border-t border-clay-700">
              {Object.entries(step.params).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <Input
                    value={key}
                    onChange={(e) => onUpdateParam(e.target.value, val, key)}
                    className="bg-clay-900 border-clay-600 text-clay-100 text-[10px] h-6 w-20 font-mono px-1.5"
                    placeholder="key"
                  />
                  <span className="text-clay-300 text-[10px]">=</span>
                  <VariableAutocomplete
                    value={val}
                    onChange={(v) => onUpdateParam(key, v)}
                    availableVars={availableVars}
                    placeholder="value"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveParam(key)}
                    className="h-5 w-5 p-0 text-red-400"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddParam}
                className="text-clay-300 h-5 text-[10px]"
              >
                <Plus className="h-2.5 w-2.5 mr-1" /> Add param
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool output preview */}
      {toolDef && toolDef.outputs && toolDef.outputs.length > 0 && (
        <div className="px-2 py-1.5 border-t border-clay-700/50">
          <div className="text-[9px] text-clay-300 mb-1">Produces:</div>
          <div className="flex flex-wrap gap-1">
            {toolDef.outputs.map((o) => (
              <Badge
                key={o.key}
                variant="secondary"
                className="text-[8px] px-1 py-0 h-3.5"
              >
                {o.key}
                <span className="text-clay-300 ml-0.5">({o.type})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
