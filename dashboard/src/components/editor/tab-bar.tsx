"use client";

import { X } from "lucide-react";
import type { EditorTab } from "./use-editor-tabs";

export function TabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
}: {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}) {
  return (
    <div className="flex items-center border-b border-clay-500 bg-clay-950 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            onMouseDown={(e) => {
              // Middle-click close
              if (e.button === 1) {
                e.preventDefault();
                onClose(tab.id);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs border-r border-clay-500 shrink-0 transition-colors ${
              isActive
                ? "bg-clay-800 text-clay-100 border-b-2 border-b-kiln-teal"
                : "text-clay-200 hover:text-clay-300 hover:bg-clay-800/50"
            }`}
          >
            {tab.isDirty && (
              <span className="h-1.5 w-1.5 rounded-full bg-kiln-mustard shrink-0" />
            )}
            <span className="truncate max-w-32">
              {tab.label || tab.variantId}
            </span>
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              className="ml-1 p-0.5 rounded hover:bg-clay-800 text-clay-300 hover:text-clay-200"
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        );
      })}
      {tabs.length === 0 && (
        <span className="px-3 py-2 text-xs text-clay-300">
          Open a variant from the file tree
        </span>
      )}
    </div>
  );
}
