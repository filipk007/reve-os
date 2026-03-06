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
import { Rocket, RotateCcw, Clock, CheckCircle } from "lucide-react";

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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleParsed = useCallback(
    (h: string[], r: Record<string, string>[]) => {
      setHeaders(h);
      setRows(r);
      setPhase("configure");
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

    // Scheduled batch
    if (scheduledAt) {
      try {
        await runBatch({
          skill,
          rows: mappedRows,
          model,
          scheduled_at: new Date(scheduledAt).toISOString(),
        });
        setPhase("scheduled");
        loadScheduledBatches();
      } catch (e) {
        alert(`Schedule failed: ${(e as Error).message}`);
      }
      return;
    }

    // Immediate batch
    setPhase("processing");
    setJobs(Array(mappedRows.length).fill(null));

    try {
      const res = await runBatch({
        skill,
        rows: mappedRows,
        model,
      });
      setJobIds(res.job_ids || []);
    } catch (e) {
      setPhase("configure");
      alert(`Batch failed: ${(e as Error).message}`);
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

  // Load scheduled batches on mount
  useEffect(() => {
    loadScheduledBatches();
  }, []);

  const completed = jobs.filter((j) => j?.status === "completed").length;
  const failed = jobs.filter(
    (j) => j?.status === "failed" || j?.status === "dead_letter"
  ).length;

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
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {phase === "upload" && <CsvUploader onParsed={handleParsed} />}

        {(phase === "configure" || phase === "processing" || phase === "done") && (
          <>
            <CsvPreview headers={headers} rows={rows} />

            {phase === "configure" && (
              <>
                <div className="grid grid-cols-2 gap-4">
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

                <div className="flex items-end gap-4">
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
                        Schedule ({rows.length} rows)
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Process All ({rows.length} rows)
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
                />
                {jobs.some((j) => j !== null) && (
                  <ResultsTable
                    jobs={jobs.filter((j): j is Job => j !== null)}
                    originalRows={rows}
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

        {/* Scheduled Batches Section */}
        {scheduledBatches.length > 0 && (
          <div className="rounded-xl border border-clay-800 bg-clay-900 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-clay-300 uppercase tracking-wide">
              Scheduled Batches
            </h3>
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
    </div>
  );
}
