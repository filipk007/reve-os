"use client";

import { useState } from "react";
import { Bell, CheckCircle, ExternalLink, Loader2, Send } from "lucide-react";
import { updatePortal, testPortalNotification } from "@/lib/api";
import { toast } from "sonner";

interface NotificationSettingsProps {
  slug: string;
  slackWebhookUrl: string | null;
  onSaved: (url: string | null) => void;
}

export function NotificationSettings({ slug, slackWebhookUrl, onSaved }: NotificationSettingsProps) {
  const [url, setUrl] = useState(slackWebhookUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const isConnected = !!slackWebhookUrl;
  const isDirty = url !== (slackWebhookUrl ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      const value = url.trim() || undefined;
      await updatePortal(slug, { slack_webhook_url: value || "" });
      onSaved(value || null);
      toast.success(value ? "Slack webhook saved" : "Slack webhook removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      await testPortalNotification(slug);
      toast.success("Test notification sent — check your Slack channel");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-clay-200 mb-3 flex items-center gap-2">
        <Bell className="h-4 w-4" />
        Slack Notifications
        {isConnected && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Connected
          </span>
        )}
      </h3>
      <div className="rounded-lg border border-clay-700 bg-clay-800 p-4 space-y-3">
        <p className="text-xs text-clay-400">
          Paste an{" "}
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-clay-300 underline underline-offset-2 hover:text-clay-100 inline-flex items-center gap-0.5"
          >
            Incoming Webhook URL
            <ExternalLink className="h-3 w-3" />
          </a>{" "}
          to receive portal notifications (deliverables, actions, SOPs) in Slack.
        </p>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/T.../B.../xxx"
          className="w-full rounded-md border border-clay-600 bg-clay-900 px-3 py-2 text-sm text-clay-100 placeholder:text-clay-500 focus:border-clay-400 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-1.5 rounded-md bg-clay-600 px-3 py-1.5 text-xs font-medium text-clay-100 hover:bg-clay-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
            Save
          </button>
          {isConnected && (
            <button
              onClick={handleTest}
              disabled={testing || isDirty}
              className="inline-flex items-center gap-1.5 rounded-md border border-clay-600 px-3 py-1.5 text-xs font-medium text-clay-300 hover:bg-clay-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Send Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
