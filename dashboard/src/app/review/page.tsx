"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { FeedbackButtons } from "@/components/feedback/feedback-buttons";
import {
  fetchReviewQueue,
  submitFeedbackBulk,
  runPatternMining,
  fetchLatestPatterns,
  fetchSkills,
  fetchClients,
  type ReviewJob,
} from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type StateFilter = "all" | "unrated" | "thumbs_up" | "thumbs_down";

export default function ReviewPage() {
  const [jobs, setJobs] = useState<ReviewJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [limit] = useState<number>(100);

  // Select state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Bulk note modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRating, setBulkRating] = useState<"thumbs_up" | "thumbs_down">("thumbs_down");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Skill + client lists (for filter dropdowns)
  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [clientOptions, setClientOptions] = useState<string[]>([]);

  // Pattern miner state
  const [patterns, setPatterns] = useState<Array<{ term: string; count: number }>>([]);
  const [patternsBySkill, setPatternsBySkill] = useState<
    Record<string, { count: number; top_terms: Array<{ term: string; count: number }> }>
  >({});
  const [patternsLastRun, setPatternsLastRun] = useState<number>(0);
  const [patternsMining, setPatternsMining] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReviewQueue({
        skill: skillFilter !== "all" ? skillFilter : undefined,
        client_slug: clientFilter !== "all" ? clientFilter : undefined,
        state: stateFilter,
        limit,
      });
      setJobs(res.jobs);
    } catch (e) {
      setError((e as Error).message || "Failed to load review queue");
    } finally {
      setLoading(false);
    }
  };

  // Load filter option lists once
  useEffect(() => {
    fetchSkills()
      .then((s) => setSkillOptions(s.skills || []))
      .catch(() => {});
    fetchClients()
      .then((c) => setClientOptions((c.clients || []).map((x) => x.slug)))
      .catch(() => {});
    fetchLatestPatterns()
      .then((p) => {
        setPatterns(p.patterns || []);
        setPatternsBySkill(p.by_skill || {});
        setPatternsLastRun(p.last_run || 0);
      })
      .catch(() => {});
  }, []);

  // Reload when filters change
  useEffect(() => {
    load();

  }, [skillFilter, clientFilter, stateFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(jobs.map((j) => j.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const handleBulkSubmit = async () => {
    if (selected.size === 0) return;
    setBulkSubmitting(true);
    try {
      const res = await submitFeedbackBulk({
        job_ids: Array.from(selected),
        rating: bulkRating,
        note: bulkNote || undefined,
      });
      toast.success(
        `Rated ${res.ok}/${res.total} jobs${res.learnings_extracted ? ` • ${res.learnings_extracted} learnings extracted` : ""}${res.failed ? ` • ${res.failed} failed` : ""}`
      );
      setBulkModalOpen(false);
      setBulkNote("");
      clearSelection();
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Bulk rating failed");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleRunPatternMining = async () => {
    setPatternsMining(true);
    try {
      const res = await runPatternMining();
      setPatterns(res.patterns || []);
      setPatternsBySkill(res.by_skill || {});
      setPatternsLastRun(res.last_run || 0);
      toast.success(`Pattern mining: ${res.total_feedback || 0} feedback entries analyzed`);
    } catch (e) {
      toast.error((e as Error).message || "Pattern mining failed");
    } finally {
      setPatternsMining(false);
    }
  };

  const unratedCount = useMemo(
    () => jobs.filter((j) => j.current_rating === null).length,
    [jobs]
  );

  return (
    <div className="flex flex-col h-screen bg-clay-950 text-white">
      <Header title="Review" />
      <main className="flex-1 overflow-hidden flex">
        {/* Main area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
            {/* Title + counts */}
            <div className="flex items-center gap-2 mb-5">
              <ClipboardCheck className="w-5 h-5 text-kiln-teal" />
              <h1 className="text-xl font-semibold">Review Queue</h1>
              {!loading && (
                <span className="text-xs text-clay-300 ml-2">
                  {jobs.length} jobs • {unratedCount} unrated
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={load}
                disabled={loading}
                className="ml-auto h-8 border-clay-700 text-clay-200"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {/* Filter bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger className="h-9 bg-clay-900 border-clay-700 text-sm">
                  <SelectValue placeholder="Skill" />
                </SelectTrigger>
                <SelectContent className="bg-clay-900 border-clay-700">
                  <SelectItem value="all">All skills</SelectItem>
                  {skillOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="h-9 bg-clay-900 border-clay-700 text-sm">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent className="bg-clay-900 border-clay-700">
                  <SelectItem value="all">All clients</SelectItem>
                  {clientOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={stateFilter}
                onValueChange={(v) => setStateFilter(v as StateFilter)}
              >
                <SelectTrigger className="h-9 bg-clay-900 border-clay-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-clay-900 border-clay-700">
                  <SelectItem value="all">All states</SelectItem>
                  <SelectItem value="unrated">Unrated only</SelectItem>
                  <SelectItem value="thumbs_up">Rated good</SelectItem>
                  <SelectItem value="thumbs_down">Rated bad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk toolbar */}
            {selected.size > 0 && (
              <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg border border-kiln-teal/30 bg-kiln-teal/5">
                <span className="text-sm text-kiln-teal font-medium">
                  {selected.size} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-clay-700 text-clay-200 ml-auto"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-kiln-teal text-white hover:bg-kiln-teal/80"
                  onClick={() => {
                    setBulkRating("thumbs_up");
                    setBulkModalOpen(true);
                  }}
                >
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  Rate good
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-kiln-coral text-white hover:bg-kiln-coral/80"
                  onClick={() => {
                    setBulkRating("thumbs_down");
                    setBulkModalOpen(true);
                  }}
                >
                  <ThumbsDown className="w-3 h-3 mr-1" />
                  Rate bad
                </Button>
              </div>
            )}

            {selected.size === 0 && jobs.length > 0 && (
              <div className="flex items-center mb-3">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-clay-300 hover:text-clay-100"
                  onClick={selectAllVisible}
                >
                  Select all {jobs.length}
                </Button>
              </div>
            )}

            {/* List */}
            {loading && <p className="text-clay-300 text-sm">Loading...</p>}
            {error && <p className="text-red-400 text-sm">{error}</p>}

            {!loading && !error && jobs.length === 0 && (
              <div className="text-center py-16 text-clay-300">
                <p className="text-sm">No jobs match these filters</p>
              </div>
            )}

            <div className="space-y-2">
              {jobs.map((j) => (
                <JobRow
                  key={j.id}
                  job={j}
                  selected={selected.has(j.id)}
                  expanded={expanded.has(j.id)}
                  onToggleSelect={() => toggleSelect(j.id)}
                  onToggleExpanded={() => toggleExpanded(j.id)}
                  onFeedbackChanged={load}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Pattern miner side panel */}
        <aside className="hidden lg:flex w-80 shrink-0 border-l border-clay-700 bg-clay-900 flex-col overflow-hidden">
          <div className="p-4 border-b border-clay-700">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-kiln-teal" />
              <h2 className="text-sm font-semibold">Pattern Miner</h2>
            </div>
            <p className="text-[11px] text-clay-300 mb-3">
              Trending terms from thumbs-down notes across all clients.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRunPatternMining}
              disabled={patternsMining}
              className="h-7 text-xs border-clay-700 text-clay-200 w-full"
            >
              <RefreshCw
                className={cn("w-3 h-3 mr-1.5", patternsMining && "animate-spin")}
              />
              {patternsMining ? "Mining..." : "Run mining"}
            </Button>
            {patternsLastRun > 0 && (
              <p className="text-[10px] text-clay-400 mt-2">
                Last run: {new Date(patternsLastRun * 1000).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {patterns.length === 0 ? (
              <p className="text-xs text-clay-400">
                No patterns yet. Submit thumbs-down with notes, then run mining.
              </p>
            ) : (
              <>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-clay-300 mb-2">
                    Top terms (all)
                  </h3>
                  <div className="space-y-1">
                    {patterns.slice(0, 15).map((p) => (
                      <div
                        key={p.term}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-clay-200">{p.term}</span>
                        <span className="text-clay-400">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {Object.keys(patternsBySkill).length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-clay-300 mb-2">
                      By skill
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(patternsBySkill).map(([skill, data]) => (
                        <div key={skill}>
                          <p className="text-xs text-clay-200 mb-1">
                            {skill}{" "}
                            <span className="text-clay-400">({data.count})</span>
                          </p>
                          <div className="space-y-0.5 ml-2">
                            {data.top_terms.slice(0, 5).map((t) => (
                              <div
                                key={t.term}
                                className="flex justify-between text-[11px]"
                              >
                                <span className="text-clay-300">{t.term}</span>
                                <span className="text-clay-400">{t.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </main>

      {/* Bulk confirmation modal */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="bg-clay-900 border-clay-700">
          <DialogHeader>
            <DialogTitle>
              {bulkRating === "thumbs_up" ? "Rate good" : "Rate bad"} —{" "}
              {selected.size} jobs
            </DialogTitle>
            <DialogDescription>
              {bulkRating === "thumbs_down"
                ? "Optional note — will feed into the learning engine for all selected jobs."
                : "Optional note attached to all selected jobs."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
            placeholder={
              bulkRating === "thumbs_down"
                ? "e.g. 'tone too formal, missing specific numbers, opening feels generic'"
                : "Optional"
            }
            className="h-24 bg-clay-950 border-clay-700 text-clay-200 placeholder:text-clay-400 text-sm resize-none"
          />
          <DialogFooter>
            <Button
              variant="outline"
              className="border-clay-700 text-clay-200"
              onClick={() => setBulkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={bulkSubmitting}
              className={cn(
                bulkRating === "thumbs_up"
                  ? "bg-kiln-teal text-white hover:bg-kiln-teal/80"
                  : "bg-kiln-coral text-white hover:bg-kiln-coral/80"
              )}
              onClick={handleBulkSubmit}
            >
              {bulkSubmitting ? "Submitting..." : `Apply to ${selected.size} jobs`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── JobRow ──────────────────────────────────────────────

function JobRow({
  job,
  selected,
  expanded,
  onToggleSelect,
  onToggleExpanded,
  onFeedbackChanged,
}: {
  job: ReviewJob;
  selected: boolean;
  expanded: boolean;
  onToggleSelect: () => void;
  onToggleExpanded: () => void;
  onFeedbackChanged: () => void;
}) {
  const rating = job.current_rating;

  return (
    <div
      className={cn(
        "rounded-lg border bg-clay-900 transition-colors",
        selected
          ? "border-kiln-teal/50"
          : rating === "thumbs_down"
          ? "border-kiln-coral/30"
          : rating === "thumbs_up"
          ? "border-kiln-teal/20"
          : "border-clay-700"
      )}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <button
          onClick={onToggleSelect}
          aria-label="Select"
          className={cn(
            "mt-1 w-4 h-4 rounded border shrink-0 transition-colors",
            selected
              ? "bg-kiln-teal border-kiln-teal"
              : "border-clay-600 hover:border-clay-400"
          )}
        >
          {selected && (
            <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
              <path
                d="M3 8l3 3 6-6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] border-clay-600 text-clay-200">
              {job.skill}
            </Badge>
            {job.client_slug && (
              <Badge
                variant="outline"
                className="text-[10px] border-kiln-teal/30 text-kiln-teal"
              >
                {job.client_slug}
              </Badge>
            )}
            <span className="text-[10px] text-clay-400">
              {new Date(job.created_at * 1000).toLocaleString()}
            </span>
            {rating && (
              <span className="text-[10px] text-clay-400">
                • {rating === "thumbs_up" ? "👍" : "👎"} rated
              </span>
            )}
            {job.status !== "completed" && (
              <Badge
                variant="outline"
                className="text-[10px] border-orange-500/30 text-orange-300"
              >
                {job.status}
              </Badge>
            )}
          </div>

          {job.result_preview && (
            <div
              className={cn(
                "mt-2 text-xs text-clay-200 font-mono whitespace-pre-wrap",
                !expanded && "line-clamp-2"
              )}
            >
              {job.result_preview}
            </div>
          )}

          <div className="mt-2 flex items-center gap-3">
            <FeedbackButtons
              jobId={job.id}
              skill={job.skill}
              clientSlug={job.client_slug}
              existing={job.feedback}
              onUpdate={() => onFeedbackChanged()}
            />
            {job.result_preview && (
              <button
                onClick={onToggleExpanded}
                className="text-[11px] text-clay-400 hover:text-clay-200 flex items-center gap-1"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" /> Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" /> Expand
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
