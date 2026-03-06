"use client";

import { useEffect, useState, useRef } from "react";
import { fetchJobs, createJobStream } from "@/lib/api";
import type { JobListItem } from "@/lib/types";
import { formatDuration, formatTimestamp } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-kiln-coral",
  normal: "text-clay-500",
  low: "text-clay-700",
};

export function JobList() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let active = true;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const refresh = () =>
      fetchJobs()
        .then((d) => active && setJobs(d.jobs))
        .catch(() => {});

    // Initial fetch
    refresh();

    // Try SSE first, fall back to polling
    try {
      const es = createJobStream(() => {
        refresh();
      });
      esRef.current = es;

      es.onerror = () => {
        es.close();
        esRef.current = null;
        // Fall back to polling
        if (!pollId && active) {
          pollId = setInterval(refresh, 3000);
        }
      };
    } catch {
      // SSE not available, use polling
      pollId = setInterval(refresh, 3000);
    }

    return () => {
      active = false;
      if (esRef.current) esRef.current.close();
      if (pollId) clearInterval(pollId);
    };
  }, []);

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No jobs yet"
        description="Run a webhook or batch to see results here."
      />
    );
  }

  return (
    <div className="rounded-xl border border-clay-800 bg-clay-900 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-clay-800 hover:bg-transparent">
            <TableHead className="text-clay-500 text-xs uppercase tracking-wide">Job ID</TableHead>
            <TableHead className="text-clay-500 text-xs uppercase tracking-wide">Skill</TableHead>
            <TableHead className="text-clay-500 text-xs uppercase tracking-wide">Row ID</TableHead>
            <TableHead className="text-clay-500 text-xs uppercase tracking-wide">Priority</TableHead>
            <TableHead className="text-clay-500 text-xs uppercase tracking-wide">Status</TableHead>
            <TableHead className="text-clay-500 text-xs uppercase tracking-wide">Retries</TableHead>
            <TableHead className="text-clay-500 text-xs uppercase tracking-wide">Duration</TableHead>
            <TableHead className="text-clay-500 text-xs uppercase tracking-wide">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow
              key={job.id}
              className="border-clay-800 hover:bg-clay-800/50 transition-colors"
            >
              <TableCell className="font-[family-name:var(--font-mono)] text-xs text-clay-400">
                {job.id}
              </TableCell>
              <TableCell className="text-kiln-teal font-medium">
                {job.skill}
              </TableCell>
              <TableCell className="text-clay-500 font-[family-name:var(--font-mono)] text-xs">
                {job.row_id || "\u2014"}
              </TableCell>
              <TableCell>
                <span className={`text-xs font-medium uppercase ${PRIORITY_COLORS[job.priority || "normal"]}`}>
                  {job.priority || "normal"}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge status={job.status} />
              </TableCell>
              <TableCell className="font-[family-name:var(--font-mono)] text-xs text-clay-500">
                {(job.retry_count ?? 0) > 0 ? `${job.retry_count}/3` : "\u2014"}
              </TableCell>
              <TableCell className="font-[family-name:var(--font-mono)] text-xs">
                {job.duration_ms ? formatDuration(job.duration_ms) : "\u2014"}
              </TableCell>
              <TableCell className="text-clay-500 text-xs">
                {formatTimestamp(job.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
