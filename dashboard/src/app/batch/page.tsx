"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { CsvUploader } from "@/components/batch/csv-uploader";
import { CsvPreview } from "@/components/batch/csv-preview";
import { ColumnMapper, autoMap } from "@/components/batch/column-mapper";
import { BatchProgress } from "@/components/batch/batch-progress";
import { ResultsTable } from "@/components/batch/results-table";
import { SkillSelector } from "@/components/playground/skill-selector";
import { ModelSelector } from "@/components/playground/model-selector";
import { runBatch, fetchJob, fetchScheduledBatches } from "@/lib/api";
import type { Job, ScheduledBatch } from "@/lib/types";
import type { Model } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Rocket, RotateCcw, Clock, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type Phase = "upload" | "configure" | "processing" | "done" | "scheduled";

export default function BatchPage() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [skill, setSkill] = useState("");
  const [model, setModel] = useState<Model>("sonnet");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledBatches, setScheduledBatches] = useState<ScheduledBatch[]>([]);
  const [scheduledCollapsed, setScheduledCollapsed] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleParsed = useCallback(
    (h: string[], r: Record<string, string>[]) => {
      setHeaders(h);
      setRows(r);
      setPhase("configure");
      toast.success("CSV uploaded", {
        description: `${r.length} rows with ${h.length} columns detected.`,
      });
    },
    []
  );

  const handleSkillChange = (s: string) => {
    setSkill(s);
    setMapping(autoMap(s, headers));
  };

  const buildMappedRows = (): Record<string, string>[] => {
    return rows.map((row, i) => {
      const mapped: Record<string, string> = { row_id: String(i) };
      for (const [field, csvCol] of Object.entries(mapping)) {
        if (csvCol && row[csvCol] !== undefined) {
          mapped[field] = row[csvCol];
        }
      }
      return mapped;
    });
  };

  const handleProcess = async () => {
    if (!skill) return;
    const mappedRows = buildMappedRows();

    // Validate scheduling datetime is in the future
    if (scheduledAt) {
      const scheduled = new Date(scheduledAt);
      if (scheduled <= new Date()) {
        toast.error("Invalid schedule time", {
          description: "Scheduled time must be in the future.",
        });
        return;
      }
      try {
        await runBatch({
          skill,
          rows: mappedRows,
          model,
          scheduled_at: scheduled.toISOString(),
        });
        setPhase("scheduled");
        loadScheduledBatches();
        toast.success("Batch scheduled", {
          description: `${mappedRows.length} rows will be processed at ${scheduled.toLocaleString()}.`,
        });
      } catch (e) {
        toast.error("Schedule failed", {
          description: (e as Error).message,
          action: {
            label: "Retry",
            onClick: () => handleProcess(),
          },
        });
      }
      return;
    }

    // Immediate batch
    setPhase("processing");
    setJobs(Array(mappedRows.length).fill(null));
    toast.info(`Processing ${mappedRows.length} rows`, {
      description: `Running ${skill} with ${model}...`,
    });

    try {
      const res = await runBatch({
        skill,
        rows: mappedRows,
        model,
      });
      setJobIds(res.job_ids || []);
    } catch (e) {
      setPhase("configure");
      toast.error("Batch failed", {
        description: (e as Error).message,
        action: {
          label: "Retry",
          onClick: () => handleProcess(),
        },
      });
    }
  };

  useEffect(() => {
    if (phase !== "processing" || jobIds.length === 0) return;

    const poll = async () => {
      const updated = await Promise.all(jobIds.map((id) => fetchJob(id)));
      setJobs(updated);

      const allDone = updated.every(
        (j) =>
          j.status === "completed" ||
          j.status === "failed" ||
          j.status === "dead_letter"
      );
      if (allDone) {
        setPhase("done");
        if (pollingRef.current) clearInterval(pollingRef.current);
        const completed = updated.filter((j) => j.status === "completed").length;
        const failed = updated.filter(
          (j) => j.status === "failed" || j.status === "dead_letter"
        ).length;
        if (failed === 0) {
          toast.success("Batch complete", {
            description: `All ${completed} rows processed successfully.`,
          });
        } else {
          toast.warning(`Batch complete with errors`, {
            description: `${completed} succeeded, ${failed} failed.`,
          });
        }
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [phase, jobIds]);

  const loadScheduledBatches = () => {
    fetchScheduledBatches()
      .then((res) => setScheduledBatches(res.batches))
      .catch(() => {});
  };

  useEffect(() => {
    loadScheduledBatches();
  }, []);

  const completed = jobs.filter((j) => j?.status === "completed").length;
  const failed = jobs.filter(
    (j) => j?.status === "failed" || j?.status === "dead_letter"
  ).length;

  const handleRetryFailed = async () => {
    const failedJobs = jobs.filter(
      (j) => j?.status === "failed" || j?.status === "dead_letter"
    );
    if (failedJobs.length === 0) return;

    const failedRows = failedJobs.map((j) => {
      const idx = parseInt(j.row_id || "0", 10);
      const original = rows[idx] || {};
      const mapped: Record<string, string> = { row_id: j.row_id || String(idx) };
      for (const [field, csvCol] of Object.entries(mapping)) {
        if (csvCol && original[csvCol] !== undefined) {
          mapped[field] = original[csvCol];
        }
      }
      return mapped;
    });

    toast.info(`Retrying ${failedRows.length} failed rows`, {
      description: `Running ${skill} with ${model}...`,
    });

    try {
      const res = await runBatch({ skill, rows: failedRows, model });
      const newJobIds = res.job_ids || [];

      // Replace failed job IDs with new ones
      const updatedJobIds = [...jobIds];
      const updatedJobs = [...jobs];
      let retryIdx = 0;
      for (let i = 0; i < updatedJobs.length; i++) {
        const j = updatedJobs[i];
        if (
          j &&
          (j.status === "failed" || j.status === "dead_letter") &&
          retryIdx < newJobIds.length
        ) {
          updatedJobIds[i] = newJobIds[retryIdx];
          updatedJobs[i] = { ...j, status: "queued", error: null, result: null, duration_ms: 0 } as Job;
          retryIdx++;
        }
      }

      setJobIds(updatedJobIds);
      setJobs(updatedJobs);
      setPhase("processing");
    } catch (e) {
      toast.error("Retry failed", {
        description: (e as Error).message,
        action: {
          label: "Retry again",
          onClick: () => handleRetryFailed(),
        },
      });
    }
  };

  const handleReset = () => {
    setPhase("upload");
    setHeaders([]);
    setRows([]);
    setSkill("");
    setMapping({});
    setJobIds([]);
    setJobs([]);
    setScheduledAt("");
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Batch Processing" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        {phase === "upload" && <CsvUploader onParsed={handleParsed} />}

        {(phase === "configure" || phase === "processing" || phase === "done") && (
          <>
            <CsvPreview headers={headers} rows={rows} />

            {phase === "configure" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SkillSelector value={skill} onChange={handleSkillChange} />
                  <ModelSelector value={model} onChange={setModel} />
                </div>

                {skill && (
                  <ColumnMapper
                    skill={skill}
                    csvHeaders={headers}
                    mapping={mapping}
                    onMappingChange={setMapping}
                  />
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-clay-500 uppercase tracking-wide mb-1.5">
                      Schedule (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-lg border border-clay-800 bg-clay-900 text-clay-200 px-3 py-2 text-sm focus:border-kiln-teal focus:outline-none"
                    />
                  </div>
                  <Button
                    onClick={handleProcess}
                    disabled={!skill}
                    className="bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light font-semibold transition-all duration-200"
                  >
                    {scheduledAt ? (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Schedule {rows.length} rows
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Process {rows.length} rows
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {(phase === "processing" || phase === "done") && (
              <>
                <BatchProgress
                  total={jobIds.length}
                  completed={completed}
                  failed={failed}
                  done={phase === "done"}
                />
                {jobs.some((j) => j !== null) && (
                  <ResultsTable
                    jobs={jobs.filter((j): j is Job => j !== null)}
                    originalRows={rows}
                    onRetryFailed={phase === "done" && failed > 0 ? handleRetryFailed : undefined}
                  />
                )}
                {phase === "done" && (
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="border-clay-700 bg-clay-900 text-clay-300 hover:bg-clay-800 hover:text-clay-100"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start New Batch
                  </Button>
                )}
              </>
            )}
          </>
        )}

        {phase === "scheduled" && (
          <div className="rounded-xl border border-kiln-teal/30 bg-kiln-teal/5 p-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-kiln-teal mx-auto" />
            <h3 className="text-lg font-semibold text-clay-100">Batch Scheduled</h3>
            <p className="text-clay-400 text-sm">
              Your batch of {rows.length} rows will be processed at the scheduled time.
            </p>
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-clay-700 bg-clay-900 text-clay-300 hover:bg-clay-800 hover:text-clay-100"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start New Batch
            </Button>
          </div>
        )}

        {/* Scheduled Batches - Collapsible */}
        {scheduledBatches.length > 0 && (
          <div className="rounded-xl border border-clay-800 bg-clay-900 overflow-hidden">
            <button
              onClick={() => setScheduledCollapsed((c) => !c)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-clay-800/50 transition-colors"
            >
              <h3 className="text-sm font-semibold text-clay-300 uppercase tracking-wide">
                Scheduled Batches
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-kiln-mustard/15 text-kiln-mustard text-xs px-1.5">
                  {scheduledBatches.length}
                </span>
              </h3>
              {scheduledCollapsed ? (
                <ChevronDown className="h-4 w-4 text-clay-500" />
              ) : (
                <ChevronUp className="h-4 w-4 text-clay-500" />
              )}
            </button>
            {!scheduledCollapsed && (
              <div className="px-4 pb-4 space-y-3">
                {scheduledBatches.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between text-sm border-b border-clay-800 pb-2 last:border-0"
                  >
                    <div>
                      <span className="text-kiln-teal font-medium">{b.skill}</span>
                      <span className="text-clay-500 ml-2">({b.total_rows} rows)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-clay-400 text-xs">
                        {new Date(b.scheduled_at * 1000).toLocaleString()}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          b.status === "scheduled"
                            ? "bg-kiln-mustard/15 text-kiln-mustard"
                            : b.status === "enqueued"
                              ? "bg-kiln-teal/15 text-kiln-teal"
                              : "bg-clay-700 text-clay-400"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
