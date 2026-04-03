/**
 * Client-side topological sort for table columns.
 * Mirrors the backend _topological_sort() in table_executor.py.
 */

import type { TableColumn, ExecutionWave, WaveEdge } from "./types";

export interface WaveGraph {
  waves: ExecutionWave[];
  edges: WaveEdge[];
  hasSequentialDeps: boolean;
}

/**
 * Compute execution waves and dependency edges from table columns.
 * Only includes executable columns (enrichment, ai, formula, gate).
 */
export function computeWaves(columns: TableColumn[]): WaveGraph {
  const execTypes = new Set(["enrichment", "ai", "formula", "gate"]);
  const execColumns = columns.filter((c) => execTypes.has(c.column_type));

  if (execColumns.length === 0) {
    return { waves: [], edges: [], hasSequentialDeps: false };
  }

  const colMap = new Map(execColumns.map((c) => [c.id, c]));
  const remaining = new Set(execColumns.map((c) => c.id));
  const resolved = new Set<string>();

  // Input/static columns are pre-resolved
  for (const c of columns) {
    if (c.column_type === "input" || c.column_type === "static") {
      resolved.add(c.id);
    }
  }

  const waves: ExecutionWave[] = [];
  const maxIterations = execColumns.length + 1;

  for (let i = 0; i < maxIterations && remaining.size > 0; i++) {
    const wave: TableColumn[] = [];
    for (const colId of remaining) {
      const col = colMap.get(colId)!;
      const deps = new Set(col.depends_on);
      // Check if all deps are resolved
      let allResolved = true;
      for (const d of deps) {
        if (!resolved.has(d)) {
          allResolved = false;
          break;
        }
      }
      if (allResolved) wave.push(col);
    }

    if (wave.length === 0) {
      // Circular or unresolvable — dump remaining
      const finalWave = [...remaining].map((id) => colMap.get(id)!);
      waves.push({ index: waves.length, columns: finalWave });
      break;
    }

    waves.push({ index: waves.length, columns: wave });
    for (const c of wave) {
      resolved.add(c.id);
      remaining.delete(c.id);
    }
  }

  // Build edges from depends_on
  const edges: WaveEdge[] = [];
  for (const col of execColumns) {
    for (const depId of col.depends_on) {
      const depCol = colMap.get(depId);
      // Only include edges between executable columns
      if (depCol) {
        edges.push({
          from: depId,
          to: col.id,
          type: depCol.column_type === "gate" ? "gate" : "data",
          condition: depCol.column_type === "gate" ? (depCol.condition_label || depCol.condition || undefined) : undefined,
        });
      } else {
        // Dependency is an input/static column — not shown in flow strip
        // No edge needed
      }
    }
  }

  const hasSequentialDeps = execColumns.some((c) => c.depends_on.length > 0);

  return { waves, edges, hasSequentialDeps };
}
