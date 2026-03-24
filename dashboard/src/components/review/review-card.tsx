"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { OutputRenderer } from "@/components/output/output-renderer";
import { Check, X, Pencil, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewItem, ReviewStatus } from "@/hooks/use-review-queue";
import { toast } from "sonner";

interface ReviewCardProps {
  item: ReviewItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, output: Record<string, unknown>) => void;
}

const STATUS_STYLES: Record<ReviewStatus, string> = {
  pending: "border-clay-600",
  approved: "border-emerald-500/30 bg-emerald-500/5",
  edited: "border-amber-500/30 bg-amber-500/5",
  rejected: "border-red-500/30 bg-red-500/5 opacity-60",
};

const STATUS_BADGES: Record<ReviewStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-clay-500/20 text-clay-200" },
  approved: { label: "Approved", className: "bg-emerald-500/15 text-emerald-400" },
  edited: { label: "Edited", className: "bg-amber-500/15 text-amber-400" },
  rejected: { label: "Rejected", className: "bg-red-500/15 text-red-400" },
};

export function ReviewCard({ item, onApprove, onReject, onEdit }: ReviewCardProps) {
  const [editing, setEditing] = useState(false);
  const [editJson, setEditJson] = useState("");

  const handleStartEdit = () => {
    const output = item.editedOutput || item.output;
    setEditJson(JSON.stringify(output, null, 2));
    setEditing(true);
  };

  const handleSaveEdit = () => {
    try {
      const parsed = JSON.parse(editJson);
      onEdit(item.id, parsed);
      setEditing(false);
    } catch {
      toast.error("Invalid JSON");
    }
  };

  const statusBadge = STATUS_BADGES[item.reviewStatus];
  const displayOutput = item.editedOutput || item.output;

  // Input summary: first 3 key-value pairs
  const inputEntries = Object.entries(item.input).slice(0, 3);

  return (
    <Card className={cn("transition-all", STATUS_STYLES[item.reviewStatus])}>
      <CardContent className="p-4">
        {/* Header: row index + status + actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-clay-300">
              Row {item.rowIndex + 1}
            </span>
            <Badge className={cn("text-[10px]", statusBadge.className)}>
              {statusBadge.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {item.reviewStatus !== "approved" && item.reviewStatus !== "edited" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onApprove(item.id)}
                className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                title="Approve"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            {item.reviewStatus !== "rejected" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReject(item.id)}
                className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                title="Reject"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEdit}
              className="h-7 px-2 text-clay-300 hover:text-clay-100"
              title="Edit output"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {(item.reviewStatus === "approved" || item.reviewStatus === "edited" || item.reviewStatus === "rejected") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onApprove(item.id)}
                className="h-7 px-2 text-clay-300 hover:text-clay-100"
                title="Reset to pending"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Input summary */}
        {inputEntries.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {inputEntries.map(([key, val]) => (
              <span
                key={key}
                className="text-[10px] text-clay-300 bg-clay-800 px-2 py-0.5 rounded"
              >
                <span className="font-mono">{key}:</span>{" "}
                {String(val).slice(0, 40)}
              </span>
            ))}
          </div>
        )}

        {/* Output or editor */}
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editJson}
              onChange={(e) => setEditJson(e.target.value)}
              rows={8}
              className="font-mono text-xs bg-clay-900 border-clay-600"
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
                className="text-clay-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                className="bg-kiln-teal text-clay-950 text-xs"
              >
                Save & Approve
              </Button>
            </div>
          </div>
        ) : (
          <OutputRenderer result={displayOutput} />
        )}
      </CardContent>
    </Card>
  );
}
