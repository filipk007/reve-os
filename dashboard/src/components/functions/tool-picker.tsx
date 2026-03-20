"use client";

import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCategory, ToolDefinition } from "@/lib/types";

interface ToolPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolCategories: ToolCategory[];
  currentTool: string;
  toolDef: ToolDefinition | undefined;
  onSelect: (toolId: string) => void;
}

export function ToolPicker({
  open,
  onOpenChange,
  toolCategories,
  currentTool,
  toolDef,
  onSelect,
}: ToolPickerProps) {
  const [search, setSearch] = useState("");

  const allTools = useMemo(
    () => toolCategories.flatMap((cat) => cat.tools),
    [toolCategories]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [search, allTools]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 w-full text-left px-1.5 py-0.5 rounded bg-clay-900 border border-clay-600 hover:border-clay-500 transition-colors min-w-0">
          <span className="text-[10px] text-clay-100 truncate flex-1">
            {toolDef?.name || currentTool || "Select tool..."}
          </span>
          <ChevronDown className="h-3 w-3 text-clay-300 shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-0 bg-clay-800 border-clay-600"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        {/* Search */}
        <div className="p-2 border-b border-clay-700">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-clay-300" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools..."
              className="bg-clay-900 border-clay-600 text-clay-100 text-xs h-7 pl-7 pr-7"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-clay-300 hover:text-clay-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {filtered && (
            <div className="text-[10px] text-clay-300 mt-1">
              {filtered.length} of {allTools.length} tools
            </div>
          )}
        </div>

        {/* Tool list */}
        <div className="max-h-64 overflow-auto p-1">
          {filtered ? (
            <div className="space-y-0.5">
              {filtered.map((tool) => (
                <ToolRow
                  key={tool.id}
                  tool={tool}
                  selected={tool.id === currentTool}
                  onSelect={() => onSelect(tool.id)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="text-xs text-clay-300 py-3 text-center">
                  No tools match
                </div>
              )}
            </div>
          ) : (
            toolCategories.map((cat) => (
              <div key={cat.category} className="mb-2">
                <div className="text-[10px] text-clay-300 uppercase tracking-wider px-2 py-1">
                  {cat.category}
                </div>
                <div className="space-y-0.5">
                  {cat.tools.map((tool) => (
                    <ToolRow
                      key={tool.id}
                      tool={tool}
                      selected={tool.id === currentTool}
                      onSelect={() => onSelect(tool.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ToolRow({
  tool,
  selected,
  onSelect,
}: {
  tool: ToolDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-2 py-1.5 rounded text-xs transition-colors",
        selected
          ? "bg-kiln-teal/10 text-kiln-teal"
          : "hover:bg-clay-700 text-clay-100"
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-medium truncate flex-1">{tool.name}</span>
        <Badge
          variant="outline"
          className={cn(
            "text-[8px] px-1 py-0 h-3.5 shrink-0",
            tool.has_native_api
              ? "text-emerald-400 border-emerald-500/30"
              : tool.execution_mode === "ai_agent"
                ? "text-purple-400 border-purple-500/30"
                : "text-amber-400 border-amber-500/30"
          )}
        >
          {tool.has_native_api
            ? "API"
            : tool.execution_mode === "ai_agent"
              ? "Agent"
              : "AI"}
        </Badge>
        {tool.inputs.length > 0 && (
          <span className="text-[8px] text-clay-300">
            {tool.inputs.length}in
          </span>
        )}
        {tool.outputs.length > 0 && (
          <span className="text-[8px] text-clay-300">
            {tool.outputs.length}out
          </span>
        )}
      </div>
      {tool.description && (
        <div className="text-[10px] text-clay-300 line-clamp-1 mt-0.5">
          {tool.description}
        </div>
      )}
    </button>
  );
}
