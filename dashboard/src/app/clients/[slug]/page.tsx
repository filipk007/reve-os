"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  MessageSquare,
  Image,
  CheckSquare,
  Eye,
  AlertCircle,
  Clock,
  User,
  Pencil,
  Check,
  Rocket,
  Bell,
  Milestone,
  Package,
  StickyNote,
  Upload,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchPortal,
  fetchSyncStatus,
  syncPortal,
  deleteSOP,
  toggleUpdatePin,
  deletePortalUpdate,
  deletePortalMedia,
  toggleAction,
  deleteAction,
  updatePortal,
} from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { PortalDetail, PortalSyncStatus, PortalAction } from "@/lib/types";
import { PortalHeader } from "@/components/portal/portal-header";
import { SOPList } from "@/components/portal/sop-list";
import { UpdateFeed } from "@/components/portal/update-feed";
import { UpdateComposer } from "@/components/portal/update-composer";
import { MediaGrid } from "@/components/portal/media-grid";
import { MediaUpload } from "@/components/portal/media-upload";
import { ActionList } from "@/components/portal/action-list";
import { ShareDialog } from "@/components/portal/share-dialog";
import { NotificationSettings } from "@/components/portal/notification-settings";

// ── Collapsible section wrapper ──

function Section({
  id,
  icon: Icon,
  label,
  count,
  badge,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  count?: number;
  badge?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-clay-700 bg-clay-800 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-clay-750 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-clay-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-clay-400 shrink-0" />
        )}
        <Icon className="h-4 w-4 text-clay-400 shrink-0" />
        <span className="text-sm font-semibold text-clay-100">{label}</span>
        {count !== undefined && (
          <span className="text-[10px] bg-clay-700 text-clay-300 px-2 py-0.5 rounded-full font-medium">
            {count}
          </span>
        )}
        {badge}
        <span className="ml-auto text-[10px] text-clay-500">
          {expanded ? "collapse" : "expand"}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-clay-700 px-5 py-4">{children}</div>
      )}
    </div>
  );
}

// ── Inline summary bar (always visible at top) ──

function SummaryStrip({ portal }: { portal: PortalDetail }) {
  const openActions = portal.actions.filter((a) => a.status !== "done").length;
  const clientActions = portal.actions.filter(
    (a) => a.owner === "client" && a.status !== "done"
  );
  const viewStats = portal.view_stats;
  const sopAcks = portal.sop_acks || {};
  const ackedCount = portal.sops.filter((s) => s.id in sopAcks).length;

  return (
    <div className="flex flex-wrap gap-2">
      <span className="flex items-center gap-1.5 text-xs text-clay-300 bg-clay-800 border border-clay-700 rounded-lg px-3 py-1.5">
        <FileText className="h-3.5 w-3.5 text-clay-400" />
        {portal.sops.length} SOPs
        {portal.sops.length > 0 && (
          <span className={cn("text-[10px]", ackedCount === portal.sops.length ? "text-emerald-400" : "text-clay-500")}>
            ({ackedCount} ack)
          </span>
        )}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-clay-300 bg-clay-800 border border-clay-700 rounded-lg px-3 py-1.5">
        <MessageSquare className="h-3.5 w-3.5 text-clay-400" />
        {portal.recent_updates.length} updates
      </span>
      <span className="flex items-center gap-1.5 text-xs text-clay-300 bg-clay-800 border border-clay-700 rounded-lg px-3 py-1.5">
        <Image className="h-3.5 w-3.5 text-clay-400" />
        {portal.media.length} files
      </span>
      <span className="flex items-center gap-1.5 text-xs text-clay-300 bg-clay-800 border border-clay-700 rounded-lg px-3 py-1.5">
        <CheckSquare className="h-3.5 w-3.5 text-clay-400" />
        {openActions} open
      </span>
      {clientActions.length > 0 && (
        <span className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          {clientActions.length} waiting on client
        </span>
      )}
      <span className="flex items-center gap-1.5 text-xs text-clay-400 bg-clay-800 border border-clay-700 rounded-lg px-3 py-1.5">
        <Eye className="h-3.5 w-3.5" />
        {viewStats?.last_viewed_at
          ? `Viewed ${formatRelativeTime(viewStats.last_viewed_at)}`
          : "Never viewed"}
      </span>
    </div>
  );
}

// ── Sidebar widgets (inline in right column) ──

function WaitingOnClient({
  actions,
  onToggle,
}: {
  actions: PortalAction[];
  onToggle?: (actionId: string) => void;
}) {
  if (actions.length === 0) return null;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="rounded-xl border-l-4 border-orange-400 bg-clay-800 border border-clay-700 p-4">
      <h3 className="text-xs font-semibold text-orange-400 mb-3 flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5" />
        Waiting on Client ({actions.length})
      </h3>
      <div className="space-y-2">
        {actions.map((action) => {
          const isOverdue = action.due_date && action.due_date < today;
          return (
            <div key={action.id} className="flex items-start gap-2 group">
              <button
                onClick={() => onToggle?.(action.id)}
                className="mt-0.5 h-4 w-4 rounded border border-clay-600 flex items-center justify-center shrink-0 hover:border-clay-400 transition-colors"
                title="Mark done"
              >
                <Check className="h-2.5 w-2.5 text-clay-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    action.priority === "high" ? "bg-red-400" : action.priority === "low" ? "bg-clay-600" : "bg-clay-400"
                  )} />
                  <span className="text-xs text-clay-200 truncate">{action.title}</span>
                  {isOverdue && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/15 text-red-400 font-medium shrink-0">Overdue</span>
                  )}
                </div>
                {action.due_date && (
                  <p className={cn("text-[10px] mt-0.5", isOverdue ? "text-red-400" : "text-clay-500")}>
                    Due: {action.due_date}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InlineNotes({
  notes,
  slug,
  onSaved,
}: {
  notes: string;
  slug: string;
  onSaved?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updatePortal(slug, { notes: value });
      toast.success("Notes saved");
      setEditing(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save notes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-clay-700 bg-clay-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-clay-200">Internal Notes</h3>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-clay-500 hover:text-clay-300" title="Edit notes">
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-clay-600 bg-clay-900 px-2.5 py-1.5 text-xs text-clay-100 placeholder:text-clay-500 focus:border-clay-400 focus:outline-none resize-none"
            placeholder="Add internal notes about this client..."
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-6 text-[11px] px-2">
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setValue(notes); setEditing(false); }} className="h-6 text-[11px] px-2 text-clay-400">
              Cancel
            </Button>
          </div>
        </div>
      ) : notes ? (
        <p className="text-xs text-clay-400 whitespace-pre-wrap">{notes}</p>
      ) : (
        <button onClick={() => setEditing(true)} className="text-xs text-clay-500 hover:text-clay-300 italic">
          No notes yet. Click to add.
        </button>
      )}
    </div>
  );
}

function OnboardingChecklist({ portal }: { portal: PortalDetail }) {
  const checks = [
    { label: "Create a SOP", done: portal.sops.length > 0 },
    { label: "Post an update", done: portal.recent_updates.length > 0 },
    { label: "Upload a file", done: portal.media.length > 0 },
    { label: "Add an action", done: portal.actions.length > 0 },
    { label: "Connect Slack", done: !!portal.meta.slack_webhook_url },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  if (completedCount === checks.length) return null;

  const pct = (completedCount / checks.length) * 100;

  return (
    <div className="rounded-xl border border-clay-700 bg-clay-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Rocket className="h-4 w-4 text-kiln-teal" />
        <h3 className="text-sm font-semibold text-clay-100">Getting Started</h3>
        <span className="text-[10px] text-clay-500 ml-auto">{completedCount}/{checks.length}</span>
      </div>
      <div className="h-1.5 rounded-full bg-clay-700 mb-3">
        <div className="h-full rounded-full bg-kiln-teal transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1.5">
        {checks.map((check) => (
          <div
            key={check.label}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 text-xs",
              check.done ? "text-clay-500" : "text-clay-300"
            )}
          >
            <span className={cn(
              "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
              check.done ? "border-kiln-teal bg-kiln-teal/20" : "border-clay-600"
            )}>
              {check.done && <Check className="h-2.5 w-2.5 text-kiln-teal" />}
            </span>
            <span className={check.done ? "line-through" : ""}>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──

export default function ClientPortalPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [portal, setPortal] = useState<PortalDetail | null>(null);
  const [syncStatus, setSyncStatus] = useState<PortalSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Sections expanded state — updates expanded by default
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    updates: true,
    actions: true,
  });

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const loadPortal = useCallback(async () => {
    try {
      const [p, ss] = await Promise.all([
        fetchPortal(slug),
        fetchSyncStatus(slug).catch(() => null),
      ]);
      setPortal(p);
      setSyncStatus(ss);
    } catch {
      toast.error("Failed to load portal");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPortal(slug);
      toast.success("Synced to Google Workspace");
      setSyncStatus({
        slug, synced: true, available: true,
        last_synced_at: result.synced_at, doc_id: result.doc_id, url: result.url,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteSOP = async (sopId: string) => {
    try { await deleteSOP(slug, sopId); toast.success("SOP deleted"); loadPortal(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete SOP"); }
  };
  const handleTogglePin = async (updateId: string) => {
    try { await toggleUpdatePin(slug, updateId); loadPortal(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to toggle pin"); }
  };
  const handleDeleteUpdate = async (updateId: string) => {
    try { await deletePortalUpdate(slug, updateId); toast.success("Update deleted"); loadPortal(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete update"); }
  };
  const handleDeleteMedia = async (mediaId: string) => {
    try { await deletePortalMedia(slug, mediaId); toast.success("Media deleted"); loadPortal(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete media"); }
  };
  const handleToggleAction = async (actionId: string) => {
    try { await toggleAction(slug, actionId); loadPortal(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to toggle action"); }
  };
  const handleDeleteAction = async (actionId: string) => {
    try { await deleteAction(slug, actionId); toast.success("Action deleted"); loadPortal(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete action"); }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 px-4">
        <div className="h-12 bg-clay-700 rounded-lg animate-pulse" />
        <div className="h-10 bg-clay-700 rounded-lg animate-pulse w-1/2" />
        <div className="h-64 bg-clay-700 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16 px-4">
        <p className="text-clay-400">Client not found.</p>
      </div>
    );
  }

  const clientActions = portal.actions.filter(
    (a) => a.owner === "client" && a.status !== "done"
  );
  const openActions = portal.actions.filter((a) => a.status !== "done").length;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12">
      <div className="space-y-5">
        {/* Header */}
        <PortalHeader
          name={portal.name}
          status={portal.meta.status}
          syncAvailable={syncStatus?.available ?? false}
          syncing={syncing}
          lastSyncedAt={syncStatus?.last_synced_at ?? null}
          shareToken={portal.meta.share_token}
          onSync={handleSync}
          onShareClick={() => setShareDialogOpen(true)}
        />

        {/* Summary strip */}
        <SummaryStrip portal={portal} />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          {/* ── Left: collapsible content sections ── */}
          <div className="space-y-4 min-w-0">
            {/* Onboarding checklist (dismisses itself when complete) */}
            <OnboardingChecklist portal={portal} />

            {/* Updates */}
            <Section
              id="updates"
              icon={MessageSquare}
              label="Updates"
              count={portal.recent_updates.length}
              expanded={!!expanded.updates}
              onToggle={() => toggle("updates")}
            >
              <div className="space-y-4">
                <UpdateComposer slug={slug} onPosted={loadPortal} />
                <UpdateFeed
                  slug={slug}
                  updates={portal.recent_updates}
                  onTogglePin={handleTogglePin}
                  onDelete={handleDeleteUpdate}
                />
              </div>
            </Section>

            {/* Actions */}
            <Section
              id="actions"
              icon={CheckSquare}
              label="Actions"
              count={openActions}
              badge={
                clientActions.length > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-orange-500/15 text-orange-400">
                    {clientActions.length} client
                  </span>
                ) : undefined
              }
              expanded={!!expanded.actions}
              onToggle={() => toggle("actions")}
            >
              <ActionList
                slug={slug}
                actions={portal.actions}
                onCreated={loadPortal}
                onUpdated={loadPortal}
                onToggle={handleToggleAction}
                onDelete={handleDeleteAction}
              />
            </Section>

            {/* SOPs */}
            <Section
              id="sops"
              icon={FileText}
              label="SOPs"
              count={portal.sops.length}
              badge={
                portal.sops.length > 0 ? (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    Object.keys(portal.sop_acks || {}).length === portal.sops.length
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-clay-500 bg-clay-700"
                  )}>
                    {Object.keys(portal.sop_acks || {}).length}/{portal.sops.length} ack
                  </span>
                ) : undefined
              }
              expanded={!!expanded.sops}
              onToggle={() => toggle("sops")}
            >
              <SOPList
                slug={slug}
                sops={portal.sops}
                sopAcks={portal.sop_acks}
                onCreated={loadPortal}
                onUpdated={loadPortal}
                onDelete={handleDeleteSOP}
              />
            </Section>

            {/* Media */}
            <Section
              id="media"
              icon={Image}
              label="Media"
              count={portal.media.length}
              expanded={!!expanded.media}
              onToggle={() => toggle("media")}
            >
              <div className="space-y-4">
                <MediaUpload slug={slug} onUploaded={loadPortal} />
                <MediaGrid media={portal.media} onDelete={handleDeleteMedia} />
              </div>
            </Section>
          </div>

          {/* ── Right: sidebar ── */}
          <div className="space-y-4">
            <WaitingOnClient actions={clientActions} onToggle={handleToggleAction} />
            <InlineNotes notes={portal.meta.notes} slug={slug} onSaved={loadPortal} />
            <NotificationSettings
              slug={slug}
              slackWebhookUrl={portal.meta.slack_webhook_url ?? null}
              notificationEmails={portal.meta.notification_emails ?? []}
              onSaved={() => loadPortal()}
              compact
            />
          </div>
        </div>
      </div>

      <ShareDialog
        slug={slug}
        shareToken={portal.meta.share_token}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        onChanged={loadPortal}
      />
    </div>
  );
}
