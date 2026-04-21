"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  listTranscripts,
  markTranscriptProcessed,
  createChannel,
  type TranscriptFile,
} from "@/lib/api";
import { FileText, PlayCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatMtime(t: number): string {
  return new Date(t * 1000).toLocaleString();
}

function phase1Prompt(path: string, clientSlug: string): string {
  return `Run the transcript-feedback-loop skill on \`${path}\` for client \`${clientSlug}\`.

Start with **Phase 1 — Extraction** only. Ground yourself in the client profile and persona files first, then extract findings into all 7 buckets (use "[empty — reason]" for any bucket with zero findings). Wait for my approval before Phase 2.`;
}

export default function TranscriptsPage() {
  const router = useRouter();
  const [inbox, setInbox] = useState<TranscriptFile[]>([]);
  const [processed, setProcessed] = useState<TranscriptFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPath, setBusyPath] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTranscripts();
      setInbox(res.inbox || []);
      setProcessed(res.processed || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load transcripts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleProcess = useCallback(
    async (t: TranscriptFile) => {
      setBusyPath(t.path);
      try {
        const session = await createChannel({
          title: `Transcript: ${t.filename}`,
        });
        const prompt = phase1Prompt(t.path, t.client_slug);
        const url = `/chat?session=${encodeURIComponent(session.id)}&prompt=${encodeURIComponent(prompt)}`;
        router.push(url);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to start session");
        setBusyPath(null);
      }
    },
    [router],
  );

  const handleMarkProcessed = useCallback(
    async (t: TranscriptFile) => {
      if (!confirm(`Move ${t.filename} to processed/?`)) return;
      setBusyPath(t.path);
      try {
        await markTranscriptProcessed(t.path);
        toast.success("Moved to processed/");
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to mark processed");
      } finally {
        setBusyPath(null);
      }
    },
    [refresh],
  );

  return (
    <div className="flex flex-col h-full">
      <Header title="Transcripts" />
      <div className="flex-1 overflow-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-clay-100">
              Transcript feedback loop
            </h2>
            <p className="text-sm text-clay-300">
              Drop sales-call transcripts into{" "}
              <code className="text-kiln-teal">transcripts/inbox/{"{client-slug}"}/</code>{" "}
              and process them through the 3-phase extraction → routing → apply flow in chat.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <section>
          <h3 className="text-sm font-mono uppercase tracking-wide text-clay-200 mb-3">
            Inbox ({inbox.length})
          </h3>
          {inbox.length === 0 ? (
            <div className="border border-dashed border-clay-700 rounded-md p-6 text-center text-sm text-clay-300">
              No unprocessed transcripts. Drop a .md file into{" "}
              <code className="text-kiln-teal">transcripts/inbox/{"{client-slug}"}/</code>.
            </div>
          ) : (
            <ul className="space-y-2">
              {inbox.map((t) => (
                <li
                  key={t.path}
                  className="flex items-center gap-3 bg-clay-850 border border-clay-700 rounded-md px-4 py-3"
                >
                  <FileText className="h-4 w-4 text-clay-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-clay-100 truncate">{t.filename}</div>
                    <div className="text-[11px] font-mono text-clay-300 truncate">
                      {t.client_slug || "—"} · {formatBytes(t.size)} · {formatMtime(t.mtime)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleProcess(t)}
                    disabled={busyPath === t.path}
                  >
                    <PlayCircle className="h-4 w-4 mr-1.5" />
                    Process in chat
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMarkProcessed(t)}
                    disabled={busyPath === t.path}
                    title="Mark as processed (move to processed/)"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-sm font-mono uppercase tracking-wide text-clay-200 mb-3">
            Processed ({processed.length})
          </h3>
          {processed.length === 0 ? (
            <div className="text-sm text-clay-300">Nothing processed yet.</div>
          ) : (
            <ul className="space-y-1.5">
              {processed.map((t) => (
                <li
                  key={t.path}
                  className="flex items-center gap-3 text-sm text-clay-200 px-4 py-2"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-kiln-teal shrink-0" />
                  <span className="truncate">{t.filename}</span>
                  <span className="text-[11px] font-mono text-clay-300 shrink-0">
                    {t.client_slug} · {formatMtime(t.mtime)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
