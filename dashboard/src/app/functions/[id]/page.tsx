"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  fetchFunction,
  updateFunction,
  deleteFunction,
  duplicateFunction,
  fetchToolCategories,
  generateFunctionClayConfig,
} from "@/lib/api";
import type {
  FunctionDefinition,
  FunctionInput,
  FunctionOutput,
  FunctionStep,
  ToolCategory,
  ToolDefinition,
} from "@/lib/types";
import { toast } from "sonner";

import { FunctionHeader } from "@/components/functions/function-header";
import { FunctionBuilder } from "@/components/functions/function-builder";
import { FunctionClayConfig } from "@/components/functions/function-clay-config";
import { FunctionRunPanel } from "@/components/functions/function-run-panel";

export default function FunctionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const funcId = params.id as string;

  const [func, setFunc] = useState<FunctionDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toolCategories, setToolCategories] = useState<ToolCategory[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [clayWizardOpen, setClayWizardOpen] = useState(false);
  const [clayConfig, setClayConfig] = useState<Record<string, unknown> | null>(null);
  const [clayWizardStep, setClayWizardStep] = useState(0);

  // Step params viewer
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);

  // Editable fields
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

  // Auto-load clay config when function loads
  const loadClayConfig = useCallback(async () => {
    try {
      const config = await generateFunctionClayConfig(funcId);
      setClayConfig(config);
    } catch {
      // Non-critical — config panel will show without API key
    }
  }, [funcId]);

  useEffect(() => {
    load();
    loadClayConfig();
    fetchToolCategories().then(r => setToolCategories(r.categories)).catch(() => {});
  }, [load, loadClayConfig]);

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

    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, func, inputs]);

  const handleSave = async () => {
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
  };

  const handleDelete = async () => {
    if (!confirm("Delete this function?")) return;
    try {
      await deleteFunction(funcId);
      toast.success("Function deleted");
      router.push("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleDuplicate = async () => {
    if (!func) return;
    try {
      const copy = await duplicateFunction(func.id);
      toast.success(`Duplicated as "${copy.name}"`);
      router.push(`/functions/${copy.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to duplicate");
    }
  };

  const handleCopyClayConfig = () => {
    if (!func) return;
    // Use the full config from the API (includes real API key, curl, etc.)
    if (clayConfig) {
      navigator.clipboard.writeText(JSON.stringify(clayConfig, null, 2));
      toast.success("Full Clay config copied (includes API key)");
      return;
    }
    // Fallback if config hasn't loaded yet
    const config = {
      url: `https://clay.nomynoms.com/webhook/functions/${func.id}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": "(load config to get key)" },
      body: {
        data: Object.fromEntries(func.inputs.map(i => [i.name, `/Column Name`])),
      },
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    toast.success("Clay config copied");
  };

  const openClayWizard = async () => {
    if (!func) return;
    try {
      const config = await generateFunctionClayConfig(func.id);
      setClayConfig(config);
      setClayWizardStep(0);
      setClayWizardOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate Clay config");
    }
  };

  const handleAddStep = (tool: string) => {
    setSteps([...steps, { tool, params: {} }]);
    setCatalogOpen(false);
  };

  const toggleStepExpanded = (i: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Function" />
        <div className="flex-1 flex items-center justify-center text-clay-300">Loading...</div>
      </div>
    );
  }

  if (!func) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <Header
          title={func.name}
          breadcrumbs={[
            { label: "Functions", href: "/" },
            { label: func.name },
          ]}
        />

        <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <FunctionHeader
            func={func}
            editing={editing}
            saving={saving}
            onEdit={() => setEditing(true)}
            onCancelEdit={() => { setEditing(false); setEditingStepIdx(null); load(); }}
            onSave={handleSave}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ErrorBoundary>
              <FunctionBuilder
                func={func}
                editing={editing}
                name={name}
                setName={setName}
                description={description}
                setDescription={setDescription}
                folder={folder}
                setFolder={setFolder}
                inputs={inputs}
                setInputs={setInputs}
                outputs={outputs}
                setOutputs={setOutputs}
                steps={steps}
                setSteps={setSteps}
                toolCategories={toolCategories}
                toolMap={toolMap}
                catalogOpen={catalogOpen}
                setCatalogOpen={setCatalogOpen}
                inputUsageMap={inputUsageMap}
                stepInputMap={stepInputMap}
                editingStepIdx={editingStepIdx}
                setEditingStepIdx={setEditingStepIdx}
                expandedSteps={expandedSteps}
                toggleStepExpanded={toggleStepExpanded}
              />
            </ErrorBoundary>

            <div className="space-y-6">
              <ErrorBoundary>
                <FunctionRunPanel func={func} inputs={inputs} />
              </ErrorBoundary>

              <ErrorBoundary>
                <FunctionClayConfig
                  func={func}
                  inputs={inputs}
                  editing={editing}
                  catalogOpen={catalogOpen}
                  toolCategories={toolCategories}
                  onAddStep={handleAddStep}
                  clayWizardOpen={clayWizardOpen}
                  setClayWizardOpen={setClayWizardOpen}
                  clayConfig={clayConfig}
                  clayWizardStep={clayWizardStep}
                  setClayWizardStep={setClayWizardStep}
                  onCopyConfig={handleCopyClayConfig}
                  onOpenWizard={openClayWizard}
                />
              </ErrorBoundary>
            </div>
          </div>

        </div>
      </div>
    </TooltipProvider>
  );
}
