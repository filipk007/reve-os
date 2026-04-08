"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Loader2,
  Sparkles,
  TrendingUp,
  Search,
  FolderOpen,
  Target,
  CheckCircle2,
  Plus,
  X,
  Trophy,
  XCircle,
  Upload,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import {
  useCampaignWizard,
  type CampaignStep,
  type CsvDealData,
  type StepAnalysis,
} from "@/hooks/use-campaign-wizard";
import { fetchClients, fetchKnowledgeBase } from "@/lib/api";
import type { ClientSummary, KnowledgeBaseFile } from "@/lib/types";

/* ── Step metadata ─────────────────────────────────── */

const STEP_META: Record<
  CampaignStep,
  { label: string; icon: React.ReactNode; description: string }
> = {
  intro: {
    label: "Campaign Builder",
    icon: <Rocket className="h-4 w-4" />,
    description: "Build campaigns your prospects would pay to receive",
  },
  invert: {
    label: "Invert Your Deals",
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Drop your closed-won and closed-lost CSVs for pattern analysis",
  },
  pain: {
    label: "Find Discoverable Pain",
    icon: <Search className="h-4 w-4" />,
    description: "Unique data sources your competitors don't have",
  },
  context: {
    label: "Load Context",
    icon: <FolderOpen className="h-4 w-4" />,
    description: "Select client profiles and knowledge base files to load",
  },
  plan: {
    label: "Plan the Play",
    icon: <Target className="h-4 w-4" />,
    description: "Strategy before execution — define your campaign angle",
  },
  review: {
    label: "Review & Score",
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: "AI scores your campaign on 5 dimensions before launch",
  },
};

const STEPS_ORDER: CampaignStep[] = [
  "intro",
  "invert",
  "pain",
  "context",
  "plan",
  "review",
];

/* ── Shared components ─────────────────────────────── */

function AnalysisPanel({ analysis }: { analysis: StepAnalysis }) {
  if (analysis.loading) {
    return (
      <div className="mt-4 rounded-md border border-kiln-teal/30 bg-kiln-teal/5 p-4">
        <div className="flex items-center gap-2 text-kiln-teal text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing your data...
        </div>
      </div>
    );
  }
  if (analysis.error) {
    return (
      <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-red-400 text-sm">{analysis.error}</p>
      </div>
    );
  }
  if (!analysis.content) return null;
  return (
    <div className="mt-4 rounded-md border border-kiln-teal/30 bg-kiln-teal/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-kiln-teal" />
        <span className="text-xs font-medium text-kiln-teal tracking-wide uppercase">
          AI Analysis
        </span>
      </div>
      <div className="text-sm text-clay-200 whitespace-pre-wrap leading-relaxed">
        {analysis.content}
      </div>
    </div>
  );
}

function WizardField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-clay-300 tracking-wide">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-md border border-clay-500 bg-clay-800 px-3 py-2 text-sm text-clay-100 placeholder:text-clay-300 focus:border-kiln-teal focus:outline-none focus:ring-1 focus:ring-kiln-teal/30 resize-none"
      />
    </div>
  );
}

function WizardInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs font-medium text-clay-300 tracking-wide">
          {label}
        </label>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-clay-500 bg-clay-800 px-3 py-1.5 text-sm text-clay-100 placeholder:text-clay-300 focus:border-kiln-teal focus:outline-none focus:ring-1 focus:ring-kiln-teal/30"
      />
    </div>
  );
}

/* ── CSV drop zone ─────────────────────────────────── */

function CsvDropZone({
  label,
  accentColor,
  icon,
  csv,
  fileRef,
  onUpload,
  onClear,
}: {
  label: string;
  accentColor: "emerald" | "red";
  icon: React.ReactNode;
  csv: CsvDealData | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  const borderColor =
    accentColor === "emerald"
      ? csv
        ? "border-emerald-500/40 bg-emerald-500/5"
        : "border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5"
      : csv
        ? "border-red-500/40 bg-red-500/5"
        : "border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5";

  const textColor =
    accentColor === "emerald" ? "text-emerald-400" : "text-red-400";

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".csv")) onUpload(file);
    },
    [onUpload]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => !csv && fileRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${borderColor} ${
        csv ? "" : "cursor-pointer"
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
      {csv ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <FileSpreadsheet className={`h-5 w-5 ${textColor}`} />
            <span className={`text-xs font-medium tracking-wide uppercase ${textColor}`}>
              {label}
            </span>
          </div>
          <p className="text-sm font-medium text-clay-100">{csv.fileName}</p>
          <p className="text-xs text-clay-300">
            {csv.totalRows} deals &middot; {csv.headers.length} columns
          </p>
          <div className="flex flex-wrap justify-center gap-1 mt-1">
            {csv.headers.slice(0, 6).map((h) => (
              <Badge key={h} variant="secondary" className="text-[10px] font-mono">
                {h}
              </Badge>
            ))}
            {csv.headers.length > 6 && (
              <Badge variant="secondary" className="text-[10px]">
                +{csv.headers.length - 6} more
              </Badge>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-xs text-clay-300 hover:text-clay-200 underline mt-1"
          >
            Replace file
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            {icon}
            <span className={`text-xs font-medium tracking-wide uppercase ${textColor}`}>
              {label}
            </span>
          </div>
          <Upload className="h-8 w-8 text-clay-300 mx-auto" />
          <p className="text-xs text-clay-300">
            Drop CSV or click to browse
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Step: Intro ───────────────────────────────────── */

function IntroStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-clay-300 leading-relaxed">
        This wizard walks you through the{" "}
        <span className="text-clay-100 font-medium">Campaign Creation Framework</span>{" "}
        — five steps to build campaigns that deliver market intelligence, not
        pitches.
      </p>
      <div className="grid grid-cols-1 gap-2">
        {STEPS_ORDER.slice(1).map((s) => (
          <div
            key={s}
            className="flex items-start gap-3 rounded-md border border-clay-600 bg-clay-800/50 p-3"
          >
            <div className="mt-0.5 text-kiln-teal">{STEP_META[s].icon}</div>
            <div>
              <p className="text-sm font-medium text-clay-100">
                {STEP_META[s].label}
              </p>
              <p className="text-xs text-clay-300">{STEP_META[s].description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-kiln-teal/20 bg-kiln-teal/5 p-3">
        <p className="text-xs text-clay-300 leading-relaxed">
          <span className="text-kiln-teal font-medium">Permissionless Value Prop:</span>{" "}
          A message so valuable the prospect would pay to receive it. That's
          the bar. The AI will guide you toward it at every step.
        </p>
      </div>
    </div>
  );
}

/* ── Step: Invert Deals (CSV) ──────────────────────── */

function InvertStep({
  wiz,
}: {
  wiz: ReturnType<typeof useCampaignWizard>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-clay-300 leading-relaxed">
        Drop your closed-won and closed-lost deal exports. The AI compares
        patterns across both to find what predicts conversion. Any CSV columns
        work — the more data, the better the analysis.
      </p>

      {/* Two drop zones side by side */}
      <div className="grid grid-cols-2 gap-3">
        <CsvDropZone
          label="Closed Won"
          accentColor="emerald"
          icon={<Trophy className="h-4 w-4 text-emerald-400" />}
          csv={wiz.wonCsv}
          fileRef={wiz.wonFileRef}
          onUpload={wiz.uploadWonCsv}
          onClear={wiz.clearWonCsv}
        />
        <CsvDropZone
          label="Closed Lost"
          accentColor="red"
          icon={<XCircle className="h-4 w-4 text-red-400" />}
          csv={wiz.lostCsv}
          fileRef={wiz.lostFileRef}
          onUpload={wiz.uploadLostCsv}
          onClear={wiz.clearLostCsv}
        />
      </div>

      {/* Deal counts */}
      {(wiz.wonCsv || wiz.lostCsv) && (
        <div className="flex items-center gap-3">
          {wiz.wonCsv && (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            >
              <Trophy className="h-3 w-3 mr-1" />
              {wiz.wonCsv.totalRows} Won
            </Badge>
          )}
          {wiz.lostCsv && (
            <Badge
              variant="outline"
              className="bg-red-500/10 text-red-400 border-red-500/30"
            >
              <XCircle className="h-3 w-3 mr-1" />
              {wiz.lostCsv.totalRows} Lost
            </Badge>
          )}
        </div>
      )}

      {/* Analyze button */}
      {(wiz.wonCsv || wiz.lostCsv) && (
        <Button
          variant="outline"
          size="sm"
          onClick={wiz.analyzeDeals}
          disabled={wiz.dealAnalysis.loading}
          className="gap-2"
        >
          {wiz.dealAnalysis.loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Analyze{" "}
          {(wiz.wonCsv?.totalRows || 0) + (wiz.lostCsv?.totalRows || 0)} deals
        </Button>
      )}

      <AnalysisPanel analysis={wiz.dealAnalysis} />
    </div>
  );
}

/* ── Step: Find Pain ───────────────────────────────── */

function PainStep({
  wiz,
}: {
  wiz: ReturnType<typeof useCampaignWizard>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-clay-300 leading-relaxed">
        Standard enrichment signals are table stakes. Find data sources unique to
        your segment.{" "}
        <span className="text-clay-100 font-medium">
          Drill, not peanut butter.
        </span>
      </p>
      <div className="space-y-3">
        {wiz.painSources.map((source, idx) => (
          <div
            key={idx}
            className="rounded-md border border-clay-600 bg-clay-800/50 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-clay-300">
                Data Source {idx + 1}
              </span>
              {wiz.painSources.length > 1 && (
                <button
                  onClick={() => wiz.removePainSource(idx)}
                  className="text-clay-300 hover:text-red-400 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <WizardInput
              value={source.dataSource}
              onChange={(v) =>
                wiz.updatePainSource(idx, { ...source, dataSource: v })
              }
              placeholder="e.g. Building permits database, SEC filings, job board scrape..."
            />
            <WizardInput
              value={source.description}
              onChange={(v) =>
                wiz.updatePainSource(idx, { ...source, description: v })
              }
              placeholder="What pain does this data reveal?"
            />
            <select
              value={source.signalType}
              onChange={(e) =>
                wiz.updatePainSource(idx, {
                  ...source,
                  signalType: e.target.value,
                })
              }
              className="w-full rounded-md border border-clay-500 bg-clay-800 px-3 py-1.5 text-sm text-clay-100 focus:border-kiln-teal focus:outline-none"
            >
              <option value="">Signal type...</option>
              <option value="funding">Funding Round</option>
              <option value="hiring">Hiring Surge</option>
              <option value="tech-stack">Tech Stack Change</option>
              <option value="leadership">Leadership Change</option>
              <option value="product-launch">Product Launch</option>
              <option value="expansion">Geographic / Market Expansion</option>
              <option value="partnership">Partnership</option>
              <option value="acquisition">Acquisition</option>
              <option value="regulatory">Regulatory / Compliance</option>
              <option value="custom">Custom / Proprietary</option>
            </select>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={wiz.addPainSource}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add data source
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={wiz.analyzePain}
          disabled={
            wiz.painAnalysis.loading ||
            !wiz.painSources.some((s) => s.dataSource)
          }
          className="gap-2"
        >
          {wiz.painAnalysis.loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Evaluate sources
        </Button>
      </div>
      <AnalysisPanel analysis={wiz.painAnalysis} />
    </div>
  );
}

/* ── Step: Load Context (from existing KB + clients) ─ */

function ContextStep({
  wiz,
}: {
  wiz: ReturnType<typeof useCampaignWizard>;
}) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [kbFiles, setKbFiles] = useState<Record<string, KnowledgeBaseFile[]>>({});
  const [loading, setLoading] = useState(true);

  // Load existing clients and KB files
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clientRes, kbRes] = await Promise.all([
          fetchClients(),
          fetchKnowledgeBase(),
        ]);
        if (!cancelled) {
          setClients(clientRes.clients);
          setKbFiles(kbRes.knowledge_base);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { campaignContext, setCampaignContext, contextAnalysis, analyzeContext } = wiz;

  // Toggle a client selection
  const toggleClient = (slug: string) => {
    const current = campaignContext.selectedClients || [];
    const next = current.includes(slug)
      ? current.filter((s: string) => s !== slug)
      : [...current, slug];
    setCampaignContext({ ...campaignContext, selectedClients: next });
  };

  // Toggle a KB file selection
  const toggleKbFile = (path: string) => {
    const current = campaignContext.selectedKbFiles || [];
    const next = current.includes(path)
      ? current.filter((p: string) => p !== path)
      : [...current, path];
    setCampaignContext({ ...campaignContext, selectedKbFiles: next });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-clay-300">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading your context files...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-clay-300 leading-relaxed">
        Select which client profiles and knowledge base files to load into this
        campaign. The AI uses these as context when generating messages.
      </p>

      {/* Client profiles */}
      {clients.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-clay-300 tracking-wide uppercase">
            Client Profiles
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {clients.map((client) => {
              const selected = (campaignContext.selectedClients || []).includes(
                client.slug
              );
              return (
                <button
                  key={client.slug}
                  onClick={() => toggleClient(client.slug)}
                  className={`flex items-center gap-2 rounded-md border p-2.5 text-left transition-colors ${
                    selected
                      ? "border-kiln-teal/50 bg-kiln-teal/10"
                      : "border-clay-600 bg-clay-800/50 hover:border-clay-500"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                      selected
                        ? "border-kiln-teal bg-kiln-teal"
                        : "border-clay-500"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3 text-clay-900" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-clay-100 truncate">
                      {client.name}
                    </p>
                    <p className="text-[10px] text-clay-300 truncate">
                      {client.industry}
                      {client.stage ? ` · ${client.stage}` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Knowledge base files by category */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-clay-300 tracking-wide uppercase">
          Knowledge Base
        </h4>
        <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
          {Object.entries(kbFiles).map(([category, files]) => (
            <div key={category} className="space-y-1.5">
              <p className="text-xs font-medium text-clay-300 capitalize">
                {category.replace(/_/g, " ")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {files.map((file) => {
                  const path = `${category}/${file.name}`;
                  const selected = (
                    campaignContext.selectedKbFiles || []
                  ).includes(path);
                  return (
                    <button
                      key={path}
                      onClick={() => toggleKbFile(path)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                        selected
                          ? "bg-kiln-teal/15 text-kiln-teal border border-kiln-teal/30"
                          : "bg-clay-800 text-clay-300 border border-clay-600 hover:border-clay-500"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {file.name.replace(".md", "")}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selection summary */}
      {((campaignContext.selectedClients?.length || 0) > 0 ||
        (campaignContext.selectedKbFiles?.length || 0) > 0) && (
        <div className="flex items-center gap-2 text-xs text-clay-300">
          <FolderOpen className="h-3.5 w-3.5" />
          {campaignContext.selectedClients?.length || 0} client
          {(campaignContext.selectedClients?.length || 0) !== 1 ? "s" : ""},{" "}
          {campaignContext.selectedKbFiles?.length || 0} KB file
          {(campaignContext.selectedKbFiles?.length || 0) !== 1 ? "s" : ""}{" "}
          selected
        </div>
      )}

      {/* Optional extra notes */}
      <WizardField
        label="Additional context (optional)"
        value={campaignContext.additionalNotes || ""}
        onChange={(v) =>
          setCampaignContext({ ...campaignContext, additionalNotes: v })
        }
        placeholder="Any extra context not covered by your existing files..."
        rows={2}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={analyzeContext}
        disabled={
          contextAnalysis.loading ||
          (!(campaignContext.selectedClients?.length) &&
            !(campaignContext.selectedKbFiles?.length))
        }
        className="gap-2"
      >
        {contextAnalysis.loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        Check for gaps
      </Button>
      <AnalysisPanel analysis={contextAnalysis} />
    </div>
  );
}

/* ── Step: Plan ────────────────────────────────────── */

function PlanStep({
  wiz,
}: {
  wiz: ReturnType<typeof useCampaignWizard>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-clay-300 leading-relaxed">
        Three questions: What unique data do we have? What pain does it prove?
        What would they pay to know?
      </p>
      <div className="space-y-3">
        <WizardField
          label="Segment"
          value={wiz.campaignPlan.segment}
          onChange={(v) =>
            wiz.setCampaignPlan({ ...wiz.campaignPlan, segment: v })
          }
          placeholder="e.g. B2B SaaS, 100-500 employees, post-Series B, hiring SDRs"
          rows={1}
        />
        <WizardField
          label="Data edge — what do we know that competitors don't?"
          value={wiz.campaignPlan.dataEdge}
          onChange={(v) =>
            wiz.setCampaignPlan({ ...wiz.campaignPlan, dataEdge: v })
          }
          placeholder="e.g. We can see their tech stack includes outdated tools..."
          rows={2}
        />
        <WizardField
          label="Pain hypothesis"
          value={wiz.campaignPlan.painHypothesis}
          onChange={(v) =>
            wiz.setCampaignPlan({ ...wiz.campaignPlan, painHypothesis: v })
          }
          placeholder="e.g. Scaling outbound but reps spend 40% of time researching..."
          rows={2}
        />
        <WizardField
          label="Permissionless Value Prop (PVP)"
          value={wiz.campaignPlan.pvp}
          onChange={(v) =>
            wiz.setCampaignPlan({ ...wiz.campaignPlan, pvp: v })
          }
          placeholder="What insight would they pay to know? e.g. 'Here are 15 companies in your ICP that just switched CRMs...'"
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <WizardInput
            label="Target persona"
            value={wiz.campaignPlan.persona}
            onChange={(v) =>
              wiz.setCampaignPlan({ ...wiz.campaignPlan, persona: v })
            }
            placeholder="e.g. VP Sales, CRO"
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-clay-300 tracking-wide">
              Messaging framework
            </label>
            <select
              value={wiz.campaignPlan.framework}
              onChange={(e) =>
                wiz.setCampaignPlan({
                  ...wiz.campaignPlan,
                  framework: e.target.value,
                })
              }
              className="w-full rounded-md border border-clay-500 bg-clay-800 px-3 py-1.5 text-sm text-clay-100 focus:border-kiln-teal focus:outline-none"
            >
              <option value="PVC">PVC (Permission-Value-CTA)</option>
              <option value="PAS">PAS (Pain-Agitate-Solve)</option>
              <option value="BAB">BAB (Before-After-Bridge)</option>
              <option value="AIDA">AIDA</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-clay-300 tracking-wide">
              Sequence type
            </label>
            <select
              value={wiz.campaignPlan.sequence}
              onChange={(e) =>
                wiz.setCampaignPlan({
                  ...wiz.campaignPlan,
                  sequence: e.target.value,
                })
              }
              className="w-full rounded-md border border-clay-500 bg-clay-800 px-3 py-1.5 text-sm text-clay-100 focus:border-kiln-teal focus:outline-none"
            >
              <option value="cold-email">Cold Email (5-touch)</option>
              <option value="linkedin-first">LinkedIn-First</option>
              <option value="warm-intro">Warm Intro</option>
            </select>
          </div>
          <WizardInput
            label="Batch size"
            value={wiz.campaignPlan.initialBatchSize}
            onChange={(v) =>
              wiz.setCampaignPlan({ ...wiz.campaignPlan, initialBatchSize: v })
            }
            placeholder="30-50"
          />
          <WizardInput
            label="Trigger signals"
            value={wiz.campaignPlan.signals}
            onChange={(v) =>
              wiz.setCampaignPlan({ ...wiz.campaignPlan, signals: v })
            }
            placeholder="e.g. Series B + hiring"
          />
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={wiz.generatePlan}
        disabled={
          wiz.planAnalysis.loading ||
          !wiz.campaignPlan.segment ||
          !wiz.campaignPlan.pvp
        }
        className="gap-2"
      >
        {wiz.planAnalysis.loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        Generate campaign plan
      </Button>
      <AnalysisPanel analysis={wiz.planAnalysis} />
    </div>
  );
}

/* ── Step: Review ──────────────────────────────────── */

function ReviewStep({
  wiz,
}: {
  wiz: ReturnType<typeof useCampaignWizard>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-clay-300 leading-relaxed">
        Final check. The AI scores your campaign on 5 dimensions and flags the
        single biggest improvement.
      </p>

      <div className="rounded-md border border-clay-600 bg-clay-800/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-clay-300 tracking-wide uppercase">
            Campaign Summary
          </h4>
          <div className="flex gap-2">
            {wiz.wonCsv && (
              <Badge variant="secondary" className="text-[10px]">
                {wiz.wonCsv.totalRows} won
              </Badge>
            )}
            {wiz.lostCsv && (
              <Badge variant="secondary" className="text-[10px]">
                {wiz.lostCsv.totalRows} lost
              </Badge>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {(
            [
              ["Segment", wiz.campaignPlan.segment],
              ["Data Edge", wiz.campaignPlan.dataEdge],
              ["Pain", wiz.campaignPlan.painHypothesis],
              ["PVP", wiz.campaignPlan.pvp],
              ["Persona", wiz.campaignPlan.persona],
              ["Framework", wiz.campaignPlan.framework],
              ["Sequence", wiz.campaignPlan.sequence],
              ["Batch", wiz.campaignPlan.initialBatchSize],
            ] as const
          ).map(([label, val]) => (
            <div key={label} className="flex gap-2">
              <span className="text-clay-300 shrink-0 w-16">{label}:</span>
              <span className="text-clay-200 truncate">
                {val || <span className="text-clay-300 italic">not set</span>}
              </span>
            </div>
          ))}
        </div>
        {((wiz.campaignContext.selectedClients?.length || 0) > 0 ||
          (wiz.campaignContext.selectedKbFiles?.length || 0) > 0) && (
          <div className="text-xs text-clay-300 border-t border-clay-600 pt-2 mt-2">
            Context: {wiz.campaignContext.selectedClients?.length || 0} clients,{" "}
            {wiz.campaignContext.selectedKbFiles?.length || 0} KB files loaded
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={wiz.generateReview}
        disabled={wiz.reviewAnalysis.loading}
        className="gap-2"
      >
        {wiz.reviewAnalysis.loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        Score this campaign
      </Button>
      <AnalysisPanel analysis={wiz.reviewAnalysis} />
    </div>
  );
}

/* ── Main dialog ───────────────────────────────────── */

export function CampaignWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const wiz = useCampaignWizard();
  const meta = STEP_META[wiz.step];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="flex items-center gap-2">
              {meta.icon}
              {meta.label}
            </DialogTitle>
            <Badge variant="secondary" className="text-[10px]">
              {wiz.stepIndex + 1} / {wiz.totalSteps}
            </Badge>
          </div>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="px-5 pb-1">
          <div className="flex gap-1">
            {STEPS_ORDER.map((s, idx) => (
              <button
                key={s}
                onClick={() => wiz.goToStep(s)}
                title={STEP_META[s].label}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx <= wiz.stepIndex ? "bg-kiln-teal" : "bg-clay-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          {wiz.step === "intro" && <IntroStep />}
          {wiz.step === "invert" && <InvertStep wiz={wiz} />}
          {wiz.step === "pain" && <PainStep wiz={wiz} />}
          {wiz.step === "context" && <ContextStep wiz={wiz} />}
          {wiz.step === "plan" && <PlanStep wiz={wiz} />}
          {wiz.step === "review" && <ReviewStep wiz={wiz} />}
        </div>

        <DialogFooter className="flex-row justify-between">
          <div className="flex gap-2">
            {wiz.canGoBack && (
              <Button variant="ghost" size="sm" onClick={wiz.goBack}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            )}
            {wiz.stepIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => wiz.reset()}
                className="text-clay-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
          <div>
            {wiz.canGoNext ? (
              <Button size="sm" onClick={wiz.goNext}>
                {wiz.step === "intro" ? "Begin" : "Continue"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => onOpenChange(false)}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Done
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Standalone trigger button ─────────────────────── */

export function CampaignWizardButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Rocket className="h-4 w-4" />
        New Campaign
      </Button>
      <CampaignWizard open={open} onOpenChange={setOpen} />
    </>
  );
}
