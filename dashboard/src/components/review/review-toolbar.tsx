"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCheck, Send, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Destination } from "@/lib/types";
import { useState } from "react";

type FilterKey = "all" | "pending" | "approved" | "rejected";

interface ReviewToolbarProps {
  counts: { all: number; pending: number; approved: number; rejected: number };
  filter: string;
  onFilterChange: (filter: FilterKey) => void;
  destinations: Destination[];
  pushing: boolean;
  onApproveAll: () => void;
  onPushApproved: (destinationId: string) => void;
  onClear: () => void;
}

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export function ReviewToolbar({
  counts,
  filter,
  onFilterChange,
  destinations,
  pushing,
  onApproveAll,
  onPushApproved,
  onClear,
}: ReviewToolbarProps) {
  const [selectedDest, setSelectedDest] = useState<string>("");

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors",
              filter === tab.key
                ? "bg-clay-700 text-clay-100"
                : "text-clay-300 hover:bg-clay-700/50"
            )}
          >
            {tab.label}
            <Badge
              variant="outline"
              className="text-[9px] border-clay-500 text-clay-300 py-0 px-1"
            >
              {counts[tab.key]}
            </Badge>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={onApproveAll}
          disabled={counts.pending === 0}
          className="border-clay-600 text-clay-200 hover:bg-clay-700 text-xs"
        >
          <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
          Approve All ({counts.pending})
        </Button>

        <div className="flex items-center gap-1.5 ml-auto">
          <Select value={selectedDest} onValueChange={setSelectedDest}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-clay-800 border-clay-600">
              <SelectValue placeholder="Select destination..." />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">
                  {d.name}
                </SelectItem>
              ))}
              {destinations.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-clay-300">
                  No destinations configured
                </div>
              )}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={() => selectedDest && onPushApproved(selectedDest)}
            disabled={!selectedDest || counts.approved === 0 || pushing}
            className="h-8 bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light text-xs font-semibold"
          >
            {pushing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5 mr-1.5" />
            )}
            Push Approved ({counts.approved})
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-clay-300 hover:text-red-400 text-xs"
          title="Clear queue"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
