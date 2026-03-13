"use client";

import { useState } from "react";
import type { Row } from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import type { Job } from "@/lib/types";
import type { SpreadsheetRow } from "./column-utils";
import { SpreadsheetCell } from "./spreadsheet-cell";
import { RowDetailPanel } from "./row-detail-panel";

function getConfidenceColor(score: number | undefined): string {
  if (score === undefined || score === null) return "";
  if (score >= 0.7) return "bg-status-success/5 hover:bg-status-success/10";
  if (score >= 0.4) return "bg-kiln-mustard/5 hover:bg-kiln-mustard/10";
  return "bg-kiln-coral/5 hover:bg-kiln-coral/10";
}

export function SpreadsheetRowComponent({
  row,
  style,
  onRowClick,
}: {
  row: Row<SpreadsheetRow>;
  style?: React.CSSProperties;
  onRowClick?: (job: Job) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = row.getIsSelected();
  const job = row.original._job;

  const confidence =
    typeof job.result?.confidence_score === "number"
      ? job.result.confidence_score
      : typeof job.result?.overall_confidence_score === "number"
        ? (job.result.overall_confidence_score as number)
        : undefined;
  const confidenceClass = getConfidenceColor(confidence);

  return (
    <>
      <tr
        style={style}
        onClick={() => {
          if (onRowClick) {
            onRowClick(job);
          } else {
            setExpanded(!expanded);
          }
        }}
        className={`border-b border-clay-500 cursor-pointer transition-colors ${
          isSelected
            ? "bg-kiln-teal/5 hover:bg-kiln-teal/10"
            : confidenceClass || "hover:bg-clay-800/50"
        } ${expanded ? "bg-clay-800/30" : ""}`}
      >
        {row.getVisibleCells().map((cell) => (
          <td
            key={cell.id}
            className="px-3 py-2"
            style={{ width: cell.column.getSize() }}
            onClick={(e) => {
              // Don't toggle expansion when clicking checkbox
              if (cell.column.id === "select") {
                e.stopPropagation();
              }
            }}
          >
            <SpreadsheetCell
              columnId={cell.column.id}
              value={cell.getValue()}
            />
          </td>
        ))}
      </tr>

      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={row.getVisibleCells().length}>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <RowDetailPanel
                  job={job}
                  originalData={row.original._original}
                />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}
