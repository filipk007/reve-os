"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  fetchFunction,
  updateFunction,
  deleteFunction,
  fetchToolCategories,
  generateFunctionClayConfig,
  streamFunctionExecution,
  previewFunction,
} from "@/lib/api";
import type {
  FunctionDefinition,
  FunctionInput,
  FunctionOutput,
  FunctionStep,
  ToolCategory,
  ToolDefinition,
  PreviewStep,
  StepTrace,
  VariableInfo,
  DataFlowEdge,
  SchemaIssue,
  CostEstimate,
} from "@/lib/types";
import { toast } from "sonner";

export interface UseFunctionBuilderReturn {
  // Loading
  loading: boolean;
  func: FunctionDefinition | null;

  // Edit mode
  editing: boolean;
  setEditing: (v: boolean) => void;
  saving: boolean;

  // Editable fields
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  folder: string;
  setFolder: (v: string) => void;
  inputs: FunctionInput[];
  setInputs: (v: FunctionInput[]) => void;
  outputs: FunctionOutput[];
  setOutputs: (v: FunctionOutput[]) => void;
  steps: FunctionStep[];
  setSteps: (v: FunctionStep[]) => void;

  // Tools
  toolCategories: ToolCategory[];
  toolMap: Record<string, ToolDefinition>;
  catalogOpen: boolean;
  setCatalogOpen: (v: boolean) => void;

  // Step editing
  expandedSteps: Set<number>;
  editingStepIdx: number | null;
  setEditingStepIdx: (v: number | null) => void;
  toggleStepExpanded: (i: number) => void;

  // Test panel
  testOpen: boolean;
  setTestOpen: (v: boolean) => void;
  testInputs: Record<string, string>;
  setTestInputs: Dispatch<SetStateAction<Record<string, string>>>;
  testResult: Record<string, unknown> | null;
  testing: boolean;
  streamingTrace: StepTrace[];

  // Preview
  preview: { steps: PreviewStep[]; unresolved_variables: string[]; summary: Record<string, number> } | null;
  previewing: boolean;

  // Clay config
  clayConfig: Record<string, unknown> | null;
  clayWizardOpen: boolean;
  setClayWizardOpen: (v: boolean) => void;
  clayWizardStep: number;
  setClayWizardStep: (v: number) => void;

  // Computed: data flow
  inputUsageMap: Record<string, number[]>;
  stepInputMap: Record<number, string[]>;
  availableVariables: (stepIndex: number) => VariableInfo[];
  dataFlowEdges: DataFlowEdge[];
  schemaIssues: SchemaIssue[];
  costEstimate: CostEstimate;

  // Actions
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleRunTest: () => void;
  handlePreview: () => Promise<void>;
  handleAddStep: (tool: string) => void;
  handleInsertStep: (tool: string, atIndex: number) => void;
  handleCopyClayConfig: () => void;
  openClayWizard: () => Promise<void>;
  load: () => Promise<void>;
}

export function useFunctionBuilder(funcId: string): UseFunctionBuilderReturn {
  const router = useRouter();

  const [func, setFunc] = useState<FunctionDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toolCategories, setToolCategories] = useState<ToolCategory[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [clayWizardOpen, setClayWizardOpen] = useState(false);
  const [clayConfig, setClayConfig] = useState<Record<string, unknown> | null>(null);
  const [clayWizardStep, setClayWizardStep] = useState(0);

  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);

  const [testOpen, setTestOpen] = useState(false);
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [testing, setTesting] = useState(false);
  const testInputsRef = useRef<Record<string, string>>({});
  testInputsRef.current = testInputs;

  const [streamingTrace, setStreamingTrace] = useState<StepTrace[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const [preview, setPreview] = useState<{
    steps: PreviewStep[];
    unresolved_variables: string[];
    summary: Record<string, number>;
  } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [folder, setFolder] = useState("");
  const [inputs, setInputs] = useState<FunctionInput[]>([]);
  const [outputs, setOutputs] = useState<FunctionOutput[]>([]);
  const [steps, setSteps] = useState<FunctionStep[]>([]);

  // Tool info map
  const toolMap = useMemo(() => {
    const map: Record<string, ToolDefinition> = {};
    for (const cat of toolCategories) {
      for (const tool of cat.tools) {
        map[tool.id] = tool;
      }
    }
    return map;
  }, [toolCategories]);

  // Data flow wiring map
  const inputUsageMap = useMemo(() => {
    const usage: Record<string, number[]> = {};
    steps.forEach((step, stepIdx) => {
      if (!step.params) return;
      Object.values(step.params).forEach((val) => {
        const matches = val.matchAll(/\{\{(\w+)\}\}/g);
        for (const m of matches) {
          const inputName = m[1];
          if (!usage[inputName]) usage[inputName] = [];
          if (!usage[inputName].includes(stepIdx)) {
            usage[inputName].push(stepIdx);
          }
        }
      });
    });
    return usage;
  }, [steps]);

  // Wired inputs per step
  const stepInputMap = useMemo(() => {
    const map: Record<number, string[]> = {};
    steps.forEach((step, stepIdx) => {
      if (!step.params) return;
      const names = new Set<string>();
      Object.values(step.params).forEach((val) => {
        const matches = val.matchAll(/\{\{(\w+)\}\}/g);
        for (const m of matches) names.add(m[1]);
      });
      if (names.size > 0) map[stepIdx] = Array.from(names);
    });
    return map;
  }, [steps]);

  // Available variables for a given step index
  const availableVariables = useCallback(
    (stepIndex: number): VariableInfo[] => {
      const vars: VariableInfo[] = inputs.map((i) => ({
        name: i.name,
        type: i.type,
        source: "input" as const,
      }));
      for (let i = 0; i < stepIndex; i++) {
        const tool = toolMap[steps[i].tool];
        if (tool?.outputs) {
          tool.outputs.forEach((o) =>
            vars.push({
              name: o.key,
              type: o.type,
              source: "step" as const,
              stepIndex: i,
              toolName: tool.name,
            })
          );
        }
      }
      return vars;
    },
    [inputs, steps, toolMap]
  );

  // Data flow edges for SVG connections
  const dataFlowEdges = useMemo(() => {
    const edges: DataFlowEdge[] = [];
    const allInputNames = new Set(inputs.map((i) => i.name));

    steps.forEach((step, stepIdx) => {
      if (!step.params) return;
      Object.values(step.params).forEach((val) => {
        const matches = val.matchAll(/\{\{(\w+)\}\}/g);
        for (const m of matches) {
          const varName = m[1];
          const isInput = allInputNames.has(varName);
          if (isInput) {
            edges.push({
              id: `input-${varName}-step-${stepIdx}`,
              fromNodeId: "inputs",
              toNodeId: `step-${stepIdx}`,
              variable: varName,
              resolved: true,
            });
          } else {
            // Check if a prior step produces this variable
            let found = false;
            for (let i = 0; i < stepIdx; i++) {
              const tool = toolMap[steps[i].tool];
              if (tool?.outputs?.some((o) => o.key === varName)) {
                edges.push({
                  id: `step-${i}-${varName}-step-${stepIdx}`,
                  fromNodeId: `step-${i}`,
                  toNodeId: `step-${stepIdx}`,
                  variable: varName,
                  resolved: true,
                });
                found = true;
                break;
              }
            }
            if (!found) {
              edges.push({
                id: `unresolved-${varName}-step-${stepIdx}`,
                fromNodeId: "unknown",
                toNodeId: `step-${stepIdx}`,
                variable: varName,
                resolved: false,
              });
            }
          }
        }
      });
    });
    return edges;
  }, [steps, inputs, toolMap]);

  // Schema validation issues
  const schemaIssues = useMemo(() => {
    const issues: SchemaIssue[] = [];
    const producedKeys = new Set<string>();
    steps.forEach((step) => {
      const tool = toolMap[step.tool];
      if (tool?.outputs) {
        tool.outputs.forEach((o) => producedKeys.add(o.key));
      }
    });

    // Check function outputs are produced
    outputs.forEach((out) => {
      if (!producedKeys.has(out.key)) {
        issues.push({
          type: "missing",
          key: out.key,
          message: `Output "${out.key}" is not produced by any step`,
        });
      }
    });

    // Check for unmapped step outputs
    const outputKeys = new Set(outputs.map((o) => o.key));
    producedKeys.forEach((key) => {
      if (!outputKeys.has(key)) {
        issues.push({
          type: "unmapped",
          key,
          message: `Step produces "${key}" but it's not mapped to a function output`,
        });
      }
    });

    return issues;
  }, [steps, outputs, toolMap]);

  // Cost estimate
  const costEstimate = useMemo(() => {
    let apiCalls = 0;
    let aiCalls = 0;
    const breakdown: string[] = [];

    steps.forEach((step) => {
      const tool = toolMap[step.tool];
      if (!tool) return;
      if (tool.has_native_api) {
        apiCalls++;
        breakdown.push(`${tool.name} (API: ${tool.native_api_provider || "Native"})`);
      } else {
        aiCalls++;
        const model = tool.execution_mode === "ai_agent" ? "Agent" : tool.model_tier || "Sonnet";
        breakdown.push(`${tool.name} (AI: ${model})`);
      }
    });

    return { apiCalls, aiCalls, breakdown };
  }, [steps, toolMap]);

  // --- Data loading ---
  const load = useCallback(async () => {
    try {
      const f = await fetchFunction(funcId);
      setFunc(f);
      setName(f.name);
      setDescription(f.description);
      setFolder(f.folder);
      setInputs(f.inputs);
      setOutputs(f.outputs);
      setSteps(f.steps);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Function not found");
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [funcId, router]);

  const loadClayConfig = useCallback(async () => {
    try {
      const config = await generateFunctionClayConfig(funcId);
      setClayConfig(config);
    } catch {
      // Non-critical
    }
  }, [funcId]);

  useEffect(() => {
    load();
    loadClayConfig();
    fetchToolCategories()
      .then((r) => setToolCategories(r.categories))
      .catch(() => {});
  }, [load, loadClayConfig]);

  // --- Actions ---
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updated = await updateFunction(funcId, {
        name,
        description,
        folder,
        inputs,
        outputs,
        steps,
      });
      setFunc(updated);
      setEditing(false);
      setEditingStepIdx(null);
      toast.success("Function saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [funcId, name, description, folder, inputs, outputs, steps]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this function?")) return;
    try {
      await deleteFunction(funcId);
      toast.success("Function deleted");
      router.push("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }, [funcId, router]);

  const handleCopyClayConfig = useCallback(() => {
    if (!func) return;
    if (clayConfig) {
      navigator.clipboard.writeText(JSON.stringify(clayConfig, null, 2));
      toast.success("Full Clay config copied (includes API key)");
      return;
    }
    const config = {
      url: `https://clay.nomynoms.com/webhook/functions/${func.id}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": "(load config to get key)" },
      body: {
        data: Object.fromEntries(func.inputs.map((i) => [i.name, `/Column Name`])),
      },
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    toast.success("Clay config copied");
  }, [func, clayConfig]);

  const openClayWizard = useCallback(async () => {
    if (!func) return;
    try {
      const config = await generateFunctionClayConfig(func.id);
      setClayConfig(config);
      setClayWizardStep(0);
      setClayWizardOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate Clay config");
    }
  }, [func]);

  const handleRunTest = useCallback(() => {
    if (!func) return;
    abortRef.current?.abort();
    setTesting(true);
    setTestResult(null);
    setStreamingTrace([]);

    abortRef.current = streamFunctionExecution(
      func.id,
      testInputsRef.current,
      (trace) => setStreamingTrace((prev) => [...prev, trace]),
      (result) => {
        setTestResult(result);
        setTesting(false);
      },
      (error) => {
        setTestResult({ error: true, message: error });
        setTesting(false);
      }
    );
  }, [func]);

  const handlePreview = useCallback(async () => {
    if (!func) return;
    setPreviewing(true);
    setPreview(null);
    setTestResult(null);
    try {
      const result = await previewFunction(func.id, testInputsRef.current);
      setPreview({
        steps: result.steps,
        unresolved_variables: result.unresolved_variables,
        summary: result.summary,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }, [func]);

  const handleAddStep = useCallback(
    (tool: string) => {
      setSteps([...steps, { tool, params: {} }]);
      setCatalogOpen(false);
    },
    [steps]
  );

  const handleInsertStep = useCallback(
    (tool: string, atIndex: number) => {
      const updated = [...steps];
      updated.splice(atIndex, 0, { tool, params: {} });
      setSteps(updated);
    },
    [steps]
  );

  const toggleStepExpanded = useCallback((i: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.key === "e" && !e.shiftKey) {
        e.preventDefault();
        if (editing) {
          setEditing(false);
          load();
        } else {
          setEditing(true);
        }
        return;
      }

      if (e.key === "s" && !e.shiftKey && editing) {
        e.preventDefault();
        handleSave();
        return;
      }

      if (e.key === "Enter" && testOpen && !testing) {
        e.preventDefault();
        handleRunTest();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editing, testOpen, testing, handleSave, handleRunTest, load]);

  return {
    loading,
    func,
    editing,
    setEditing,
    saving,
    name,
    setName,
    description,
    setDescription,
    folder,
    setFolder,
    inputs,
    setInputs,
    outputs,
    setOutputs,
    steps,
    setSteps,
    toolCategories,
    toolMap,
    catalogOpen,
    setCatalogOpen,
    expandedSteps,
    editingStepIdx,
    setEditingStepIdx,
    toggleStepExpanded,
    testOpen,
    setTestOpen,
    testInputs,
    setTestInputs,
    testResult,
    testing,
    streamingTrace,
    preview,
    previewing,
    clayConfig,
    clayWizardOpen,
    setClayWizardOpen,
    clayWizardStep,
    setClayWizardStep,
    inputUsageMap,
    stepInputMap,
    availableVariables,
    dataFlowEdges,
    schemaIssues,
    costEstimate,
    handleSave,
    handleDelete,
    handleRunTest,
    handlePreview,
    handleAddStep,
    handleInsertStep,
    handleCopyClayConfig,
    openClayWizard,
    load,
  };
}
