"use client";

import { useState, useCallback, useEffect } from "react";
import {
  runWebhook,
  fetchSkillContent,
  updateSkillContent,
  fetchVariants,
  forkVariant,
} from "@/lib/api";
import type { VariantDef, WebhookResponse } from "@/lib/types";
import type { Model } from "@/lib/constants";
import {
  EMAIL_LAB_TEMPLATES,
  STORAGE_KEY,
  MAX_HISTORY,
  type EmailLabSkill,
  type EmailLabRun,
  type EmailLabTemplate,
} from "@/lib/email-lab-constants";

export type EditorTab = "data" | "instructions" | "skill";

export interface UseEmailLabReturn {
  // Template state
  selectedTemplate: EmailLabTemplate | null;
  selectTemplate: (id: string) => void;

  // Editor state
  dataJson: string;
  setDataJson: (v: string) => void;
  instructions: string;
  setInstructions: (v: string) => void;
  activeTab: EditorTab;
  setActiveTab: (t: EditorTab) => void;

  // Skill state
  selectedSkill: EmailLabSkill;
  setSelectedSkill: (s: EmailLabSkill) => void;
  skillContent: string;
  setSkillContent: (v: string) => void;
  skillLoading: boolean;
  saveSkillContent: () => Promise<void>;

  // Variant state
  selectedVariant: string | null;
  setSelectedVariant: (id: string | null) => void;
  variants: VariantDef[];
  forkCurrentSkill: () => Promise<void>;

  // Model
  selectedModel: Model;
  setSelectedModel: (m: Model) => void;

  // Run state
  result: WebhookResponse | null;
  loading: boolean;
  error: string | null;
  runEmail: () => Promise<void>;

  // History
  history: EmailLabRun[];
  restoreRun: (run: EmailLabRun) => void;
  clearHistory: () => void;
}

function loadHistory(): EmailLabRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(runs: EmailLabRun[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage full — silently ignore
  }
}

export function useEmailLab(): UseEmailLabReturn {
  // Template
  const [selectedTemplate, setSelectedTemplate] = useState<EmailLabTemplate | null>(
    EMAIL_LAB_TEMPLATES[0]
  );

  // Editor
  const [dataJson, setDataJson] = useState(
    JSON.stringify(EMAIL_LAB_TEMPLATES[0].data, null, 2)
  );
  const [instructions, setInstructions] = useState("");
  const [activeTab, setActiveTab] = useState<EditorTab>("data");

  // Skill
  const [selectedSkill, setSelectedSkillRaw] = useState<EmailLabSkill>("email-gen");
  const [skillContent, setSkillContent] = useState("");
  const [skillLoading, setSkillLoading] = useState(false);

  // Variants
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantDef[]>([]);

  // Model
  const [selectedModel, setSelectedModel] = useState<Model>("sonnet");

  // Run state
  const [result, setResult] = useState<WebhookResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<EmailLabRun[]>(loadHistory);

  // Load skill content when skill changes
  const loadSkillContent = useCallback(async (skill: string) => {
    setSkillLoading(true);
    try {
      const { content } = await fetchSkillContent(skill);
      setSkillContent(content);
    } catch {
      setSkillContent("// Failed to load skill content");
    } finally {
      setSkillLoading(false);
    }
  }, []);

  // Load variants when skill changes
  const loadVariants = useCallback(async (skill: string) => {
    try {
      const { variants: v } = await fetchVariants(skill);
      setVariants(v);
    } catch {
      setVariants([]);
    }
  }, []);

  useEffect(() => {
    loadSkillContent(selectedSkill);
    loadVariants(selectedSkill);
    setSelectedVariant(null);
  }, [selectedSkill, loadSkillContent, loadVariants]);

  // Select template
  const selectTemplate = useCallback((id: string) => {
    const tpl = EMAIL_LAB_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setSelectedTemplate(tpl);
    setDataJson(JSON.stringify(tpl.data, null, 2));
    setResult(null);
    setError(null);
  }, []);

  // Change skill (also reset variant)
  const setSelectedSkill = useCallback((s: EmailLabSkill) => {
    setSelectedSkillRaw(s);
    setSelectedVariant(null);
  }, []);

  // Run email
  const runEmail = useCallback(async () => {
    setLoading(true);
    setError(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(dataJson);
    } catch {
      setError("Invalid JSON in data editor");
      setLoading(false);
      return;
    }

    try {
      const body: Parameters<typeof runWebhook>[0] = {
        skill: selectedSkill,
        data: parsed,
        model: selectedModel,
      };
      if (instructions.trim()) {
        body.instructions = instructions.trim();
      }

      const res = await runWebhook(body);
      setResult(res);

      // Save to history
      const run: EmailLabRun = {
        id: crypto.randomUUID(),
        templateId: selectedTemplate?.id ?? null,
        skill: selectedSkill,
        model: selectedModel,
        variantId: selectedVariant,
        data: parsed,
        instructions: instructions.trim(),
        result: res as Record<string, unknown>,
        durationMs: res._meta?.duration_ms ?? 0,
        timestamp: Date.now(),
      };
      setHistory((prev) => {
        const next = [run, ...prev].slice(0, MAX_HISTORY);
        saveHistory(next);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [dataJson, selectedSkill, selectedModel, instructions, selectedTemplate, selectedVariant]);

  // Save skill content
  const saveSkillContent = useCallback(async () => {
    try {
      await updateSkillContent(selectedSkill, skillContent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save skill");
    }
  }, [selectedSkill, skillContent]);

  // Fork skill
  const forkCurrentSkill = useCallback(async () => {
    try {
      const variant = await forkVariant(selectedSkill);
      setVariants((prev) => [...prev, variant]);
      setSelectedVariant(variant.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fork skill");
    }
  }, [selectedSkill]);

  // Restore a run from history
  const restoreRun = useCallback((run: EmailLabRun) => {
    setDataJson(JSON.stringify(run.data, null, 2));
    setInstructions(run.instructions);
    setSelectedSkillRaw(run.skill);
    setSelectedModel(run.model as Model);
    setResult(run.result as WebhookResponse);
    setSelectedVariant(run.variantId);
    setSelectedTemplate(
      EMAIL_LAB_TEMPLATES.find((t) => t.id === run.templateId) ?? null
    );
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  return {
    selectedTemplate,
    selectTemplate,
    dataJson,
    setDataJson,
    instructions,
    setInstructions,
    activeTab,
    setActiveTab,
    selectedSkill,
    setSelectedSkill,
    skillContent,
    setSkillContent,
    skillLoading,
    saveSkillContent,
    selectedVariant,
    setSelectedVariant,
    variants,
    forkCurrentSkill,
    selectedModel,
    setSelectedModel,
    result,
    loading,
    error,
    runEmail,
    history,
    restoreRun,
    clearHistory,
  };
}
