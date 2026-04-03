"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Brain,
  Calculator,
  Filter,
  ChevronDown,
  ChevronRight,
  Check,
  AlertTriangle,
  SkipForward,
  Loader2,
  Diamond,
} from "lucide-react";
import type { TableColumn, TableDefinition } from "@/lib/types";
import type { ColumnProgress } from "@/hooks/use-table-builder";
import { computeWaves } from "@/lib/compute-waves";

const TYPE_ICONS: Record<string, typeof Search> = {
  enrichment: Search,
  ai: Brain,
  formula: Calculator,
  gate: Filter,
};

const TYPE_COLORS: Record<string, string> = {
  enrichment: "border-l-blue-400",
  ai: "border-l-purple-400",
  formula: "border-l-teal-400",
  gate: "border-l-amber-400",
};

const TYPE_ICON_COLORS: Record<string, string> = {
  enrichment: "text-blue-400",
  ai: "text-purple-400",
  formula: "text-teal-400",
  gate: "text-amber-400",
};

type NodeStatus = "idle" | "pending" | "running" | "done" | "error" | "mixed" | "skipped";

function getNodeStatus(
  columnId: string,
  progress: Record<string, ColumnProgress>,
  executing: boolean,
): NodeStatus {
  const p = progress[columnId];
  if (!p) return executing ? "pending" : "idle";
  if (p.done === 0 && p.errors === 0) return "running";
  if (p.done + p.errors >= p.total) {
    if (p.errors === p.total) return "error";
    if (p.errors > 0) return "mixed";
    return "done";
  }
  return "running";
}

const STATUS_STYLES: Record<NodeStatus, string> = {
  idle: "border-zinc-700 bg-zinc-900/50",
  pending: "border-amber-400/60 bg-zinc-900/50 animate-pulse",
  running: "border-blue-400 bg-zinc-900/80 ring-1 ring-blue-400/30",
  done: "border-emerald-500 bg-zinc-900/80",
  error: "border-red-500 bg-red-500/5",
  mixed: "border-emerald-500 bg-zinc-900/80",
  skipped: "border-zinc-600 border-dashed bg-zinc-900/30",
};

interface FlowNodeProps {
  column: TableColumn;
  status: NodeStatus;
  progress?: ColumnProgress;
  onClick: () => void;
}

function FlowNode({ column, status, progress, onClick }: FlowNodeProps) {
  const Icon = TYPE_ICONS[column.column_type] || Search;
  const iconColor = TYPE_ICON_COLORS[column.column_type] || "text-zinc-400";
  const typeColor = TYPE_COLORS[column.column_type] || "border-l-zinc-600";

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-l-2
        text-xs cursor-pointer transition-all hover:bg-zinc-800/80
        min-w-[120px] max-w-[160px]
        ${typeColor} ${STATUS_STYLES[status]}
      `}
      title={`${column.name} (${column.column_type})`}
    >
      {/* Status indicator */}
      {status === "running" && (
        <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
      )}
      {status === "done" && (
        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
      )}
      {status === "error" && (
        <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
      )}
      {status === "mixed" && (
        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
      )}
      {status === "skipped" && (
        <SkipForward className="w-3 h-3 text-zinc-500 shrink-0" />
      )}
      {(status === "idle" || status === "pending") && (
        <Icon className={`w-3 h-3 shrink-0 ${iconColor}`} />
      )}

      <span className="truncate text-zinc-300">{column.name}</span>

      {/* Error count badge */}
      {progress && progress.errors > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] leading-none px-1 py-0.5 rounded-full">
          {progress.errors}
        </span>
      )}

      {/* Micro progress bar */}
      {progress && progress.total > 0 && status === "running" && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-800 rounded-b-md overflow-hidden">
          <div
            className="h-full bg-blue-400 transition-all duration-300"
            style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
          />
        </div>
      )}

      {/* Done progress bar */}
      {progress && progress.total > 0 && (status === "done" || status === "mixed") && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-md overflow-hidden flex">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${Math.round(((progress.done - progress.errors) / progress.total) * 100)}%` }}
          />
          {progress.errors > 0 && (
            <div
              className="h-full bg-red-500"
              style={{ width: `${Math.round((progress.errors / progress.total) * 100)}%` }}
            />
          )}
        </div>
      )}
    </button>
  );
}

interface FlowConnectorProps {
  condition?: string;
  hasError?: boolean;
}

function FlowConnector({ condition, hasError }: FlowConnectorProps) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <div className={`w-4 h-px ${hasError ? "bg-red-500/50 border-dashed" : "bg-zinc-600"}`} />
      {condition ? (
        <div className="flex items-center gap-0.5" title={condition}>
          <Diamond className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="text-[9px] text-amber-400/80 max-w-[60px] truncate">{condition}</span>
        </div>
      ) : null}
      <div className="relative">
        <div className={`w-4 h-px ${hasError ? "bg-red-500/50" : "bg-zinc-600"}`} />
        {/* Arrow head */}
        <div
          className={`absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0
            border-t-[3px] border-t-transparent
            border-b-[3px] border-b-transparent
            border-l-[4px] ${hasError ? "border-l-red-500/50" : "border-l-zinc-600"}
          `}
        />
      </div>
    </div>
  );
}

interface PipelineFlowStripProps {
  table: TableDefinition;
  columnProgress: Record<string, ColumnProgress>;
  executing: boolean;
  onScrollToColumn?: (columnId: string) => void;
}

export function PipelineFlowStrip({
  table,
  columnProgress,
  executing,
  onScrollToColumn,
}: PipelineFlowStripProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("flow-strip-collapsed") === "true";
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem("flow-strip-collapsed", String(collapsed));
  }, [collapsed]);

  const { waves, edges, hasSequentialDeps } = useMemo(
    () => computeWaves(table.columns),
    [table.columns],
  );

  // Don't show if no sequential dependencies or fewer than 2 executable columns
  const execCount = waves.reduce((acc, w) => acc + w.columns.length, 0);
  if (!hasSequentialDeps || execCount < 2) return null;

  // Build a quick lookup for edge conditions between columns
  const edgeMap = useMemo(() => {
    const map = new Map<string, { condition?: string }>();
    for (const edge of edges) {
      map.set(`${edge.from}->${edge.to}`, { condition: edge.condition });
    }
    return map;
  }, [edges]);

  // Check if a column has errors (for connector styling)
  const hasErrors = useCallback(
    (colId: string) => {
      const p = columnProgress[colId];
      return p ? p.errors > 0 : false;
    },
    [columnProgress],
  );

  const handleNodeClick = useCallback(
    (columnId: string) => {
      onScrollToColumn?.(columnId);
    },
    [onScrollToColumn],
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="border-b border-zinc-800/50 bg-zinc-950/80"
      >
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-1.5 px-4 py-1 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          <span>Execution Flow</span>
          <span className="text-zinc-600">
            {waves.length} {waves.length === 1 ? "step" : "steps"}
          </span>
        </button>

        {/* Flow strip content */}
        {!collapsed && (
          <div
            ref={scrollRef}
            className="flex items-center gap-0 px-4 pb-2 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800"
          >
            {waves.map((wave, waveIdx) => (
              <div key={wave.index} className="flex items-center gap-0 shrink-0">
                {/* Connector from previous wave */}
                {waveIdx > 0 && (
                  <FlowConnector
                    condition={
                      // Find any gate condition on edges leading into this wave
                      wave.columns
                        .flatMap((col) =>
                          col.depends_on.map((dep) => edgeMap.get(`${dep}->${col.id}`)),
                        )
                        .find((e) => e?.condition)?.condition
                    }
                    hasError={
                      // Check if any upstream column in the previous wave has errors
                      waves[waveIdx - 1].columns.some((c) => hasErrors(c.id))
                    }
                  />
                )}

                {/* Wave columns (stacked vertically if multiple) */}
                <div className="flex flex-col gap-1">
                  {wave.columns.map((col) => (
                    <FlowNode
                      key={col.id}
                      column={col}
                      status={getNodeStatus(col.id, columnProgress, executing)}
                      progress={columnProgress[col.id]}
                      onClick={() => handleNodeClick(col.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
