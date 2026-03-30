"use client";

import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { runWebhook } from "@/lib/api";

export type CampaignStep =
  | "intro"
  | "invert"
  | "pain"
  | "context"
  | "plan"
  | "review";

/* ── CSV deal data ─────────────────────────────────── */

export interface CsvDealData {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface PainSource {
  dataSource: string;
  description: string;
  signalType: string;
}

export interface CampaignContext {
  selectedClients: string[];
  selectedKbFiles: string[];
  additionalNotes: string;
}

export interface CampaignPlan {
  segment: string;
  dataEdge: string;
  painHypothesis: string;
  pvp: string;
  persona: string;
  framework: string;
  sequence: string;
  signals: string;
  initialBatchSize: string;
}

export interface StepAnalysis {
  content: string;
  loading: boolean;
  error: string | null;
}

export interface UseCampaignWizardReturn {
  // Navigation
  step: CampaignStep;
  stepIndex: number;
  totalSteps: number;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: CampaignStep) => void;
  canGoNext: boolean;
  canGoBack: boolean;

  // Step 1: Invert from best deals — CSV upload
  wonCsv: CsvDealData | null;
  lostCsv: CsvDealData | null;
  wonFileRef: React.RefObject<HTMLInputElement | null>;
  lostFileRef: React.RefObject<HTMLInputElement | null>;
  uploadWonCsv: (file: File) => void;
  uploadLostCsv: (file: File) => void;
  clearWonCsv: () => void;
  clearLostCsv: () => void;
  dealAnalysis: StepAnalysis;
  analyzeDeals: () => Promise<void>;

  // Step 2: Find discoverable pain
  painSources: PainSource[];
  addPainSource: () => void;
  updatePainSource: (idx: number, source: PainSource) => void;
  removePainSource: (idx: number) => void;
  painAnalysis: StepAnalysis;
  analyzePain: () => Promise<void>;

  // Step 3: Build context
  campaignContext: CampaignContext;
  setCampaignContext: (val: CampaignContext) => void;
  contextAnalysis: StepAnalysis;
  analyzeContext: () => Promise<void>;

  // Step 4: Plan the play
  campaignPlan: CampaignPlan;
  setCampaignPlan: (val: CampaignPlan) => void;
  planAnalysis: StepAnalysis;
  generatePlan: () => Promise<void>;

  // Step 5: Review
  reviewAnalysis: StepAnalysis;
  generateReview: () => Promise<void>;

  // Global
  reset: () => void;
}

const STEPS: CampaignStep[] = ["intro", "invert", "pain", "context", "plan", "review"];

const emptyContext: CampaignContext = {
  selectedClients: [],
  selectedKbFiles: [],
  additionalNotes: "",
};

const emptyPlan: CampaignPlan = {
  segment: "",
  dataEdge: "",
  painHypothesis: "",
  pvp: "",
  persona: "",
  framework: "PVC",
  sequence: "cold-email",
  signals: "",
  initialBatchSize: "50",
};

const emptyAnalysis: StepAnalysis = { content: "", loading: false, error: null };

function parseCsvFile(
  file: File,
  setter: (data: CsvDealData) => void,
) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      const headers = result.meta.fields || [];
      const rows = result.data as Record<string, string>[];
      setter({
        fileName: file.name,
        headers,
        rows,
        totalRows: rows.length,
      });
    },
  });
}

/** Summarize CSV rows for the AI prompt — include all columns, sample first rows */
function summarizeCsv(label: string, csv: CsvDealData | null, maxRows = 20): string {
  if (!csv || csv.rows.length === 0) return `${label}: (no data)\n`;
  const sample = csv.rows.slice(0, maxRows);
  const lines = sample.map((row) => {
    return csv.headers
      .map((h) => `${h}: ${row[h] || "—"}`)
      .join(" | ");
  });
  return `${label} (${csv.totalRows} deals, columns: ${csv.headers.join(", ")}):\n${lines.join("\n")}\n`;
}

export function useCampaignWizard(): UseCampaignWizardReturn {
  const [step, setStep] = useState<CampaignStep>("intro");

  // Step 1 — CSV uploads
  const [wonCsv, setWonCsv] = useState<CsvDealData | null>(null);
  const [lostCsv, setLostCsv] = useState<CsvDealData | null>(null);
  const wonFileRef = useRef<HTMLInputElement | null>(null);
  const lostFileRef = useRef<HTMLInputElement | null>(null);
  const [dealAnalysis, setDealAnalysis] = useState<StepAnalysis>(emptyAnalysis);

  // Step 2
  const [painSources, setPainSources] = useState<PainSource[]>([
    { dataSource: "", description: "", signalType: "" },
  ]);
  const [painAnalysis, setPainAnalysis] = useState<StepAnalysis>(emptyAnalysis);

  // Step 3
  const [campaignContext, setCampaignContext] = useState<CampaignContext>(emptyContext);
  const [contextAnalysis, setContextAnalysis] = useState<StepAnalysis>(emptyAnalysis);

  // Step 4
  const [campaignPlan, setCampaignPlan] = useState<CampaignPlan>(emptyPlan);
  const [planAnalysis, setPlanAnalysis] = useState<StepAnalysis>(emptyAnalysis);

  // Step 5
  const [reviewAnalysis, setReviewAnalysis] = useState<StepAnalysis>(emptyAnalysis);

  // Navigation
  const stepIndex = STEPS.indexOf(step);
  const canGoNext = stepIndex < STEPS.length - 1;
  const canGoBack = stepIndex > 0;

  const goNext = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }, [step]);

  const goBack = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }, [step]);

  const goToStep = useCallback((s: CampaignStep) => setStep(s), []);

  // CSV uploads
  const uploadWonCsv = useCallback((file: File) => parseCsvFile(file, setWonCsv), []);
  const uploadLostCsv = useCallback((file: File) => parseCsvFile(file, setLostCsv), []);
  const clearWonCsv = useCallback(() => {
    setWonCsv(null);
    if (wonFileRef.current) wonFileRef.current.value = "";
  }, []);
  const clearLostCsv = useCallback(() => {
    setLostCsv(null);
    if (lostFileRef.current) lostFileRef.current.value = "";
  }, []);

  // AI analysis runner
  const runAiAnalysis = useCallback(
    async (prompt: string, setter: (val: StepAnalysis) => void) => {
      setter({ content: "", loading: true, error: null });
      try {
        const res = await runWebhook({
          skill: "classify",
          data: { raw_text: prompt },
          instructions:
            "You are a GTM campaign strategist helping build a high-conversion outbound campaign. Analyze the data provided and give specific, actionable recommendations. Use bullet points and headers. Be opinionated — tell them what to do, not what they could do. No fluff, no hedging.",
          model: "sonnet",
        });
        const content =
          typeof res === "string"
            ? res
            : (res as Record<string, unknown>)?.result
              ? String((res as Record<string, unknown>).result)
              : JSON.stringify(res, null, 2);
        setter({ content, loading: false, error: null });
      } catch (e) {
        setter({
          content: "",
          loading: false,
          error: e instanceof Error ? e.message : "Analysis failed",
        });
      }
    },
    []
  );

  // Step 1 — Analyze deals
  const analyzeDeals = useCallback(async () => {
    const wonSummary = summarizeCsv("CLOSED-WON", wonCsv);
    const lostSummary = summarizeCsv("CLOSED-LOST", lostCsv);

    const prompt = `Analyze these closed deals to find patterns that predict future conversions. Compare won vs lost to find the differentiators.

${wonSummary}
${lostSummary}

Analyze and provide:

1. **WINNING PATTERN** — What do won deals have in common that lost deals don't? Look across all available columns — company attributes, buyer titles, industries, deal sizes, sales cycles, signals, and close reasons.

2. **PREDICTIVE SIGNALS** — What observable/public signals appeared before won deals? Which could you detect BEFORE they enter pipeline?

3. **LOSS PATTERN** — What characterizes losses? Is it pricing, timing, competition, or wrong buyer?

4. **ICP REFINEMENT** — Based on this data, who exactly should you target? Be specific: title, company size/type, industry, and trigger signals.

5. **DATA SOURCES** — What databases, APIs, or public records could surface these predictive signals early? Think beyond standard enrichment.

6. **PVP SEED** — Based on won deals, what market intelligence would be so valuable to this buyer persona that they'd respond to a cold email delivering it?`;

    await runAiAnalysis(prompt, setDealAnalysis);
  }, [wonCsv, lostCsv, runAiAnalysis]);

  // Step 2 — Analyze pain sources
  const analyzePain = useCallback(async () => {
    const sourcesText = painSources
      .filter((s) => s.dataSource || s.description)
      .map((s, i) => `Source ${i + 1}: ${s.dataSource} — ${s.description} (signal type: ${s.signalType})`)
      .join("\n");

    const wonSample = wonCsv?.rows.slice(0, 5).map((r) =>
      Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(", ")
    ).join("\n") || "(no deal data)";

    const prompt = `Evaluate these discoverable pain data sources for a GTM campaign:

${sourcesText}

Context from won deals (sample):
${wonSample}

For each data source:
1. **Uniqueness** — Does everyone have this data, or is it a proprietary edge?
2. **Pain signal** — What specific pain does this data prove?
3. **PVP potential** — What insight from this data would the prospect pay to receive?
4. **Verdict** — Go deeper on this source, or find something better?

Then recommend the strongest campaign angle from these sources.`;
    await runAiAnalysis(prompt, setPainAnalysis);
  }, [painSources, wonCsv, runAiAnalysis]);

  // Step 3 — Analyze context
  const analyzeContext = useCallback(async () => {
    const clientList = campaignContext.selectedClients.length
      ? `Client profiles loaded: ${campaignContext.selectedClients.join(", ")}`
      : "No client profiles selected";
    const kbList = campaignContext.selectedKbFiles.length
      ? `KB files loaded: ${campaignContext.selectedKbFiles.join(", ")}`
      : "No KB files selected";

    const prompt = `Review the context selection for this campaign and identify gaps:

${clientList}
${kbList}
${campaignContext.additionalNotes ? `Additional notes: ${campaignContext.additionalNotes}` : ""}

Deals analyzed: ${wonCsv?.totalRows || 0} won, ${lostCsv?.totalRows || 0} lost
Data sources: ${painSources.map((s) => s.dataSource).filter(Boolean).join(", ")}

Based on the files selected, tell me:
1. What context is missing that would make messages stronger? (e.g. missing competitive intel, missing persona docs, missing industry context)
2. Which objections should we preempt based on the loaded context?
3. Which persona to target first and why?
4. Biggest risk with this campaign given the loaded context?`;
    await runAiAnalysis(prompt, setContextAnalysis);
  }, [campaignContext, wonCsv, lostCsv, painSources, runAiAnalysis]);

  // Step 4 — Generate plan
  const generatePlan = useCallback(async () => {
    const prompt = `Generate a campaign execution plan:

Segment: ${campaignPlan.segment}
Data edge: ${campaignPlan.dataEdge}
Pain hypothesis: ${campaignPlan.painHypothesis}
PVP: ${campaignPlan.pvp}
Persona: ${campaignPlan.persona}
Framework: ${campaignPlan.framework}
Sequence: ${campaignPlan.sequence}
Signals: ${campaignPlan.signals}
Batch size: ${campaignPlan.initialBatchSize}

Context loaded: ${campaignContext.selectedClients.length} client profiles, ${campaignContext.selectedKbFiles.length} KB files.
Deals analyzed: ${wonCsv?.totalRows || 0} won, ${lostCsv?.totalRows || 0} lost.

Provide:
1. A sample first-touch message using the ${campaignPlan.framework} framework
2. The exact data fields needed per prospect
3. Qualification criteria
4. Success metrics and thresholds
5. When to scale vs. iterate`;
    await runAiAnalysis(prompt, setPlanAnalysis);
  }, [campaignPlan, campaignContext, wonCsv, lostCsv, runAiAnalysis]);

  // Step 5 — Generate review
  const generateReview = useCallback(async () => {
    const prompt = `Final campaign review. Score 1-10 on each dimension:

SEGMENT: ${campaignPlan.segment}
DATA EDGE: ${campaignPlan.dataEdge}
PAIN HYPOTHESIS: ${campaignPlan.painHypothesis}
PVP: ${campaignPlan.pvp}
PERSONA: ${campaignPlan.persona}
FRAMEWORK: ${campaignPlan.framework}
SEQUENCE: ${campaignPlan.sequence}

Based on ${(wonCsv?.totalRows || 0) + (lostCsv?.totalRows || 0)} analyzed deals (${wonCsv?.totalRows || 0} won, ${lostCsv?.totalRows || 0} lost).
Context: ${campaignContext.selectedClients.length} client profiles, ${campaignContext.selectedKbFiles.length} KB files loaded.
Data sources: ${painSources.map((s) => s.dataSource).filter(Boolean).join(", ")}

Score on:
1. Specificity (is the segment tight enough?)
2. Data edge (do competitors have this data too?)
3. PVP strength (would they pay to receive this?)
4. Pain-to-product connection
5. Scalability (can you run this on 500+ prospects?)

Then give the ONE thing that would most improve this campaign.`;
    await runAiAnalysis(prompt, setReviewAnalysis);
  }, [campaignPlan, campaignContext, wonCsv, lostCsv, painSources, runAiAnalysis]);

  // Pain source management
  const addPainSource = useCallback(() => {
    setPainSources((prev) => [...prev, { dataSource: "", description: "", signalType: "" }]);
  }, []);
  const updatePainSource = useCallback((idx: number, source: PainSource) => {
    setPainSources((prev) => prev.map((s, i) => (i === idx ? source : s)));
  }, []);
  const removePainSource = useCallback((idx: number) => {
    setPainSources((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const reset = useCallback(() => {
    setStep("intro");
    setWonCsv(null);
    setLostCsv(null);
    if (wonFileRef.current) wonFileRef.current.value = "";
    if (lostFileRef.current) lostFileRef.current.value = "";
    setPainSources([{ dataSource: "", description: "", signalType: "" }]);
    setCampaignContext(emptyContext);
    setCampaignPlan(emptyPlan);
    setDealAnalysis(emptyAnalysis);
    setPainAnalysis(emptyAnalysis);
    setContextAnalysis(emptyAnalysis);
    setPlanAnalysis(emptyAnalysis);
    setReviewAnalysis(emptyAnalysis);
  }, []);

  return {
    step,
    stepIndex,
    totalSteps: STEPS.length,
    goNext,
    goBack,
    goToStep,
    canGoNext,
    canGoBack,
    wonCsv,
    lostCsv,
    wonFileRef,
    lostFileRef,
    uploadWonCsv,
    uploadLostCsv,
    clearWonCsv,
    clearLostCsv,
    dealAnalysis,
    analyzeDeals,
    painSources,
    addPainSource,
    updatePainSource,
    removePainSource,
    painAnalysis,
    analyzePain,
    campaignContext,
    setCampaignContext,
    contextAnalysis,
    analyzeContext,
    campaignPlan,
    setCampaignPlan,
    planAnalysis,
    generatePlan,
    reviewAnalysis,
    generateReview,
    reset,
  };
}
