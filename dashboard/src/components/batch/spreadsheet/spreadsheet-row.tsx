"use client";

import { useState } from "react";
import type { Row } from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import type { SpreadsheetRow } from "./column-utils";
import { SpreadsheetCell } from "./spreadsheet-cell";
import { RowDetailPanel } from "./row-detail-panel";

export function SpreadsheetRowComponent({
  row,
  style,
}: {
  row: Row<SpreadsheetRow>;
  style?: React.CSSProperties;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = row.getIsSelected();
  const job = row.original._job;

  return (
    <>
      <tr
        style={style}
        onClick={() => setExpanded(!expanded)}
        className={`border-b border-clay-800 cursor-pointer transition-colors ${
          isSelected
            ? "bg-kiln-teal/5 hover:bg-kiln-teal/10"
            : "hover:bg-clay-900/50"
        } ${expanded ? "bg-clay-900/30" : ""}`}
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
