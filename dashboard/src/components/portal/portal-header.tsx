"use client";

import { cn } from "@/lib/utils";
import { ArrowLeft, Cloud, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  onboarding: "bg-blue-500/15 text-blue-400",
  paused: "bg-amber-500/15 text-amber-400",
  churned: "bg-red-500/15 text-red-400",
};

interface PortalHeaderProps {
  name: string;
  status: string;
  syncAvailable: boolean;
  syncing: boolean;
  lastSyncedAt: number | null;
  shareToken: string | null;
  onSync: () => void;
  onShareClick: () => void;
}

export function PortalHeader({
  name,
  status,
  syncAvailable,
  syncing,
  lastSyncedAt,
  shareToken,
  onSync,
  onShareClick,
}: PortalHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-clay-300 hover:text-clay-100">
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-clay-100">{name}</h1>
          <span
            className={cn(
              "text-[11px] px-2 py-0.5 rounded-full font-medium inline-block mt-1",
              STATUS_COLORS[status] || STATUS_COLORS.active
            )}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onShareClick}
          className="border-clay-600 text-clay-200 hover:bg-clay-700 gap-2"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
          {shareToken && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          )}
        </Button>
      </div>
    </div>
  );
}
