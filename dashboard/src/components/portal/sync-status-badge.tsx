"use client";

import { Cloud, CloudOff, ExternalLink } from "lucide-react";
import type { PortalSyncStatus } from "@/lib/types";

export function SyncStatusBadge({ status }: { status: PortalSyncStatus | null }) {
  if (!status || !status.available) return null;

  if (!status.synced) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-clay-400">
        <CloudOff className="h-3.5 w-3.5" />
        Not synced
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-[11px] text-blue-400">
      <Cloud className="h-3.5 w-3.5" />
      Synced
      {status.url && (
        <a
          href={status.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-300"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </span>
  );
}
