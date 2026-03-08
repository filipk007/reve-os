"use client";

import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";

export function FlowDragOverlay({
  skillName,
  index,
}: {
  skillName: string;
  index: number;
}) {
  return (
    <div
      className="rounded-lg border-2 border-kiln-teal bg-clay-900/90 p-4 shadow-xl backdrop-blur-sm"
      style={{ transform: "rotate(2deg)", opacity: 0.85, width: "100%" }}
    >
      <div className="flex items-center gap-3">
        <GripVertical className="h-4 w-4 text-clay-500" />
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-kiln-teal/15 border border-kiln-teal/30">
          <span className="text-xs font-bold text-kiln-teal font-[family-name:var(--font-mono)]">
            {index + 1}
          </span>
        </div>
        <span className="font-medium text-clay-200">{skillName}</span>
      </div>
    </div>
  );
}
