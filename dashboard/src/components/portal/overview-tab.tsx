"use client";

import { FileText, MessageSquare, Image, Pin, Clock, CheckSquare, AlertCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortalDetail } from "@/lib/types";
import { NotificationSettings } from "./notification-settings";

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-clay-600 bg-clay-800 p-4">
      <div className="flex items-center gap-2 text-clay-300 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-clay-100">{value}</p>
    </div>
  );
}

export function OverviewTab({ portal, onPortalUpdated }: { portal: PortalDetail; onPortalUpdated?: () => void }) {
  const pinnedUpdates = portal.recent_updates.filter((u) => u.pinned);
  const clientActions = portal.actions.filter(
    (a) => a.owner === "client" && a.status !== "done"
  );

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="SOPs" value={portal.sops.length} />
        <StatCard icon={MessageSquare} label="Updates" value={portal.recent_updates.length} />
        <StatCard icon={Image} label="Media Files" value={portal.media.length} />
        <StatCard icon={CheckSquare} label="Actions" value={portal.actions.filter((a) => a.status !== "done").length} />
      </div>

      {/* Waiting on Client */}
      {clientActions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Waiting on Client ({clientActions.length})
          </h3>
          <div className="space-y-2">
            {clientActions.map((action) => (
              <div
                key={action.id}
                className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    action.priority === "high" ? "bg-red-400" : action.priority === "low" ? "bg-clay-600" : "bg-clay-400"
                  )} />
                  <h4 className="text-sm font-medium text-clay-100 flex-1">{action.title}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-orange-400 bg-orange-500/10">
                    <User className="h-2.5 w-2.5 inline mr-0.5" />
                    client
                  </span>
                </div>
                {action.due_date && (
                  <p className="text-[10px] text-clay-400 mt-1">Due: {action.due_date}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pinned Updates */}
      {pinnedUpdates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-clay-200 mb-3 flex items-center gap-2">
            <Pin className="h-4 w-4 text-amber-400" />
            Pinned
          </h3>
          <div className="space-y-2">
            {pinnedUpdates.map((update) => (
              <div
                key={update.id}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-clay-700 text-clay-300 uppercase font-medium">
                    {update.type}
                  </span>
                  <h4 className="text-sm font-medium text-clay-100">{update.title}</h4>
                </div>
                {update.body && (
                  <p className="text-xs text-clay-300 line-clamp-2">{update.body}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h3 className="text-sm font-semibold text-clay-200 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </h3>
        {portal.recent_updates.length === 0 ? (
          <p className="text-sm text-clay-400">No updates yet. Post your first update to get started.</p>
        ) : (
          <div className="space-y-2">
            {portal.recent_updates.slice(0, 5).map((update) => (
              <div
                key={update.id}
                className="flex items-start gap-3 rounded-lg border border-clay-700 bg-clay-800 p-3"
              >
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-clay-700 text-clay-300 uppercase font-medium shrink-0 mt-0.5">
                  {update.type}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-clay-100 truncate">{update.title}</h4>
                  {update.body && (
                    <p className="text-xs text-clay-400 line-clamp-1 mt-0.5">{update.body}</p>
                  )}
                </div>
                <span className="text-[10px] text-clay-500 shrink-0">
                  {new Date(update.created_at * 1000).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {portal.meta.notes && (
        <div>
          <h3 className="text-sm font-semibold text-clay-200 mb-2">Internal Notes</h3>
          <div className="rounded-lg border border-clay-700 bg-clay-800 p-3">
            <p className="text-sm text-clay-300 whitespace-pre-wrap">{portal.meta.notes}</p>
          </div>
        </div>
      )}

      {/* Slack Notifications */}
      <NotificationSettings
        slug={portal.slug}
        slackWebhookUrl={portal.meta.slack_webhook_url ?? null}
        onSaved={() => onPortalUpdated?.()}
      />
    </div>
  );
}
