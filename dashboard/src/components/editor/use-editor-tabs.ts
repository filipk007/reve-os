"use client";

import { useState, useCallback } from "react";

export interface EditorTab {
  id: string;
  skill: string;
  variantId: string;
  label: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
}

export function useEditorTabs() {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = useCallback(
    (skill: string, variantId: string, label: string, content: string) => {
      const id = `${skill}/${variantId}`;
      setTabs((prev) => {
        const existing = prev.find((t) => t.id === id);
        if (existing) return prev;
        return [
          ...prev,
          {
            id,
            skill,
            variantId,
            label,
            content,
            originalContent: content,
            isDirty: false,
          },
        ];
      });
      setActiveTabId(id);
    },
    []
  );

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeTabId === id) {
          const closedIndex = prev.findIndex((t) => t.id === id);
          const newActive = next[Math.min(closedIndex, next.length - 1)];
          setActiveTabId(newActive?.id || null);
        }
        return next;
      });
    },
    [activeTabId]
  );

  const updateContent = useCallback((id: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, content, isDirty: content !== t.originalContent }
          : t
      )
    );
  }, []);

  const markSaved = useCallback((id: string, newContent: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, content: newContent, originalContent: newContent, isDirty: false }
          : t
      )
    );
  }, []);

  const updateLabel = useCallback((id: string, label: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, label } : t))
    );
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  return {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    openTab,
    closeTab,
    updateContent,
    markSaved,
    updateLabel,
  };
}
