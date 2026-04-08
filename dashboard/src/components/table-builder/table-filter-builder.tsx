"use client";

import type { ReactNode } from "react";
import { Eye, EyeOff, X, Plus } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TableColumn } from "@/lib/types";
import type { FilterCondition, FilterOperator } from "./table-filter-types";
import {
  OPERATOR_LABELS,
  VALUE_LESS_OPERATORS,
} from "./table-filter-types";

interface TableFilterBuilderProps {
  columns: TableColumn[];
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  children: ReactNode;
}

export function TableFilterBuilder({
  columns,
  filters,
  onFiltersChange,
  children,
}: TableFilterBuilderProps) {
  const addFilter = () => {
    const defaultColumnId = columns[0]?.id || "";
    onFiltersChange([
      ...filters,
      {
        id: crypto.randomUUID(),
        columnId: defaultColumnId,
        operator: "contains",
        value: "",
        enabled: true,
      },
    ]);
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    onFiltersChange(
      filters.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  };

  const toggleFilter = (id: string) => {
    const filter = filters.find((f) => f.id === id);
    if (filter) updateFilter(id, { enabled: !filter.enabled });
  };

  const clearAll = () => {
    onFiltersChange([]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-[560px] bg-zinc-900 border-zinc-700 p-3"
      >
        {filters.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-xs text-clay-300 mb-3">
              No filters applied
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-clay-200 hover:text-white text-xs h-7"
              onClick={addFilter}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add filter
            </Button>
          </div>
        ) : (
          <>
            {/* Filter rows */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filters.map((filter, index) => (
                <FilterRow
                  key={filter.id}
                  filter={filter}
                  columns={columns}
                  isFirst={index === 0}
                  onChange={(updates) => updateFilter(filter.id, updates)}
                  onRemove={() => removeFilter(filter.id)}
                  onToggle={() => toggleFilter(filter.id)}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                className="text-clay-200 hover:text-white text-xs h-7"
                onClick={addFilter}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add filter
              </Button>
              <button
                onClick={clearAll}
                className="text-xs text-red-400 hover:text-red-300 transition-colors ml-auto"
              >
                Clear filters
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function FilterRow({
  filter,
  columns,
  isFirst,
  onChange,
  onRemove,
  onToggle,
}: {
  filter: FilterCondition;
  columns: TableColumn[];
  isFirst: boolean;
  onChange: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
  onToggle: () => void;
}) {
  const showValue = !VALUE_LESS_OPERATORS.includes(filter.operator);
  const isMultiValue =
    filter.operator === "contains_any_of" ||
    filter.operator === "does_not_contain_any_of";

  return (
    <div className="flex items-center gap-1.5">
      {/* Where / And label */}
      <span className="text-xs text-clay-300 w-10 shrink-0 text-right">
        {isFirst ? "Where" : "And"}
      </span>

      {/* Column selector */}
      <Select
        value={filter.columnId}
        onValueChange={(v) => onChange({ columnId: v })}
      >
        <SelectTrigger size="sm" className="w-[140px] text-xs h-7 px-2">
          <SelectValue placeholder="Column..." />
        </SelectTrigger>
        <SelectContent>
          {columns.map((col) => (
            <SelectItem key={col.id} value={col.id}>
              {col.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select
        value={filter.operator}
        onValueChange={(v) => onChange({ operator: v as FilterOperator })}
      >
        <SelectTrigger size="sm" className="w-[150px] text-xs h-7 px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(OPERATOR_LABELS) as FilterOperator[]).map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input */}
      {showValue ? (
        <Input
          value={filter.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder={isMultiValue ? "value1, value2" : "value..."}
          className="h-7 text-xs bg-zinc-800 border-zinc-700 text-white flex-1 min-w-[80px]"
        />
      ) : (
        <div className="flex-1" />
      )}

      {/* Toggle visibility */}
      <button
        onClick={onToggle}
        className={`p-1 rounded hover:bg-zinc-700 transition-colors shrink-0 ${
          filter.enabled ? "text-clay-200" : "text-clay-300/40"
        }`}
        title={filter.enabled ? "Disable filter" : "Enable filter"}
      >
        {filter.enabled ? (
          <Eye className="w-3.5 h-3.5" />
        ) : (
          <EyeOff className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-zinc-700 text-clay-300 hover:text-red-400 transition-colors shrink-0"
        title="Remove filter"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
