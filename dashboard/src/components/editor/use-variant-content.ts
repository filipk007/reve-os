"use client";

import { useState, useCallback } from "react";
import { getVariant, updateVariant } from "@/lib/api";
import { toast } from "sonner";

export function useVariantContent() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadContent = useCallback(
    async (skill: string, variantId: string): Promise<{ label: string; content: string } | null> => {
      setLoading(true);
      try {
        const variant = await getVariant(skill, variantId);
        return { label: variant.label, content: variant.content };
      } catch (e) {
        toast.error("Failed to load variant", { description: (e as Error).message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const saveContent = useCallback(
    async (skill: string, variantId: string, label: string, content: string): Promise<boolean> => {
      setSaving(true);
      try {
        await updateVariant(skill, variantId, { label, content });
        toast.success("Saved");
        return true;
      } catch (e) {
        toast.error("Save failed", { description: (e as Error).message });
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return { loading, saving, loadContent, saveContent };
}
