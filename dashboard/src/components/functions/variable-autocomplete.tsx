"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VariableInfo } from "@/lib/types";

interface VariableAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  availableVars: VariableInfo[];
  placeholder?: string;
  className?: string;
}

export function VariableAutocomplete({
  value,
  onChange,
  availableVars,
  placeholder,
  className,
}: VariableAutocompleteProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorPosRef = useRef(0);

  // Group vars by source
  const groupedVars = useCallback(() => {
    const q = filter.toLowerCase();
    const filtered = availableVars.filter((v) =>
      v.name.toLowerCase().includes(q)
    );

    const inputVars = filtered.filter((v) => v.source === "input");
    const groups: { label: string; vars: VariableInfo[] }[] = [];

    if (inputVars.length > 0) {
      groups.push({ label: "Function Inputs", vars: inputVars });
    }

    // Group step vars by stepIndex
    const stepMap = new Map<number, VariableInfo[]>();
    filtered
      .filter((v) => v.source === "step")
      .forEach((v) => {
        const idx = v.stepIndex ?? 0;
        if (!stepMap.has(idx)) stepMap.set(idx, []);
        stepMap.get(idx)!.push(v);
      });

    stepMap.forEach((vars, idx) => {
      const toolName = vars[0]?.toolName || `Step ${idx + 1}`;
      groups.push({
        label: `Step ${idx + 1}: ${toolName}`,
        vars,
      });
    });

    return groups;
  }, [availableVars, filter]);

  const flatFiltered = useCallback(() => {
    return groupedVars().flatMap((g) => g.vars);
  }, [groupedVars]);

  const handleInput = (newValue: string) => {
    onChange(newValue);

    const el = inputRef.current;
    if (!el) return;

    const pos = el.selectionStart || 0;
    cursorPosRef.current = pos;

    // Check if we're inside or just typed `{{`
    const textBefore = newValue.slice(0, pos);
    const openIdx = textBefore.lastIndexOf("{{");

    if (openIdx !== -1) {
      const textAfterOpen = textBefore.slice(openIdx + 2);
      // Only show if no `}}` between open and cursor
      if (!textAfterOpen.includes("}}")) {
        setFilter(textAfterOpen);
        setShowDropdown(true);
        setSelectedIdx(0);
        return;
      }
    }

    setShowDropdown(false);
  };

  const insertVariable = (varName: string) => {
    const pos = cursorPosRef.current;
    const textBefore = value.slice(0, pos);
    const openIdx = textBefore.lastIndexOf("{{");

    if (openIdx !== -1) {
      const before = value.slice(0, openIdx);
      const after = value.slice(pos);
      onChange(`${before}{{${varName}}}${after}`);
    } else {
      onChange(value + `{{${varName}}}`);
    }

    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    const items = flatFiltered();
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (items[selectedIdx]) {
        insertVariable(items[selectedIdx].name);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.closest(".var-autocomplete-wrapper")?.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const groups = groupedVars();

  return (
    <div className={cn("relative var-autocomplete-wrapper", className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay to allow click on dropdown
          setTimeout(() => setShowDropdown(false), 150);
        }}
        placeholder={placeholder}
        className="bg-clay-900 border-clay-600 text-clay-100 text-[10px] h-6 px-1.5"
      />

      {showDropdown && groups.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 w-56 bg-clay-800 border border-clay-600 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-auto p-1">
            {groups.map((group) => {
              let groupStartIdx = 0;
              const allFlat = flatFiltered();
              for (const g of groups) {
                if (g === group) break;
                groupStartIdx += g.vars.length;
              }

              return (
                <div key={group.label} className="mb-1">
                  <div className="text-[9px] text-clay-300 uppercase tracking-wider px-2 py-0.5">
                    {group.label}
                  </div>
                  {group.vars.map((v, vi) => {
                    const absIdx = groupStartIdx + vi;
                    return (
                      <button
                        key={v.name}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertVariable(v.name);
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1 rounded text-[10px] flex items-center gap-1.5 transition-colors",
                          absIdx === selectedIdx
                            ? "bg-kiln-teal/10 text-kiln-teal"
                            : "hover:bg-clay-700 text-clay-100"
                        )}
                      >
                        <span className="font-mono truncate">{v.name}</span>
                        <Badge
                          variant="outline"
                          className="text-[8px] px-1 py-0 h-3 ml-auto shrink-0"
                        >
                          {v.type}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
