"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface HorizontalConnectorProps {
  editing: boolean;
  onInsert?: () => void;
  hasUnresolved?: boolean;
}

export function HorizontalConnector({
  editing,
  onInsert,
  hasUnresolved,
}: HorizontalConnectorProps) {
  return (
    <div className="hidden md:flex items-center shrink-0 relative group">
      <div
        className={cn(
          "w-8 h-0.5",
          hasUnresolved
            ? "bg-amber-500/50 border-t border-dashed border-amber-500/50"
            : "bg-clay-600"
        )}
      />
      {editing && onInsert && (
        <button
          onClick={onInsert}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 h-5 w-5 rounded-full bg-clay-700 border border-clay-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-clay-600 hover:border-kiln-teal z-10"
        >
          <Plus className="h-3 w-3 text-clay-300" />
        </button>
      )}
    </div>
  );
}
