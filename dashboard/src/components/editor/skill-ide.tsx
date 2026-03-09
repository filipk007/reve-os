"use client";

import { useState, useEffect, useCallback } from "react";
import { FileTree } from "./file-tree";
import { TabBar } from "./tab-bar";
import { EditorPane } from "./editor-pane";
import { PreviewPane } from "./preview-pane";
import { RunPanel } from "./run-panel";
import { DiffView } from "./diff-view";
import { EditorToolbar, type PreviewMode } from "./editor-toolbar";
import { useEditorTabs } from "./use-editor-tabs";
import { useVariantContent } from "./use-variant-content";

export function SkillIDE({
  initialSkill,
  initialVariant,
}: {
  initialSkill?: string;
  initialVariant?: string;
}) {
  const {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    openTab,
    closeTab,
    updateContent,
    markSaved,
    updateLabel,
  } = useEditorTabs();

  const { loading, saving, loadContent, saveContent } = useVariantContent();
  const [previewMode, setPreviewMode] = useState<PreviewMode>("off");
  const [diffActive, setDiffActive] = useState(false);
  const [diffContent, setDiffContent] = useState("");
  const [runPanelSkill, setRunPanelSkill] = useState("");

  // Load initial variant from URL params
  useEffect(() => {
    if (initialSkill && initialVariant) {
      handleOpenVariant(initialSkill, initialVariant, initialVariant === "default" ? "default" : initialVariant);
    }
  }, [initialSkill, initialVariant]);

  const handleOpenVariant = async (skill: string, variantId: string, label: string) => {
    const id = `${skill}/${variantId}`;
    const existing = tabs.find((t) => t.id === id);
    if (existing) {
      setActiveTabId(id);
      return;
    }

    if (variantId === "default") {
      // Default skill content — open with empty content placeholder
      openTab(skill, variantId, "default", "# Default skill.md\n\nThis is the production skill file. Fork to create a variant.");
      return;
    }

    const result = await loadContent(skill, variantId);
    if (result) {
      openTab(skill, variantId, result.label, result.content);
    }
  };

  const handleSave = useCallback(async () => {
    if (!activeTab || activeTab.variantId === "default") return;
    const success = await saveContent(
      activeTab.skill,
      activeTab.variantId,
      activeTab.label,
      activeTab.content
    );
    if (success) {
      markSaved(activeTab.id, activeTab.content);
    }
  }, [activeTab, saveContent, markSaved]);

  const handleTogglePreview = () => {
    setPreviewMode((prev) => {
      if (prev === "off") return "markdown";
      if (prev === "markdown") return "assembled";
      return "off";
    });
  };

  const handleToggleDiff = () => {
    if (!diffActive && activeTab) {
      // Store current original content for diffing
      setDiffContent(activeTab.originalContent);
    }
    setDiffActive(!diffActive);
  };

  const handleRunToggle = () => {
    if (activeTab) {
      setRunPanelSkill(activeTab.skill);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunToggle();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  const wordCount = activeTab?.content.split(/\s+/).filter(Boolean).length || 0;
  const charCount = activeTab?.content.length || 0;

  return (
    <div className="flex h-full bg-clay-950">
      {/* File tree sidebar */}
      <div className="w-52 shrink-0 border-r border-clay-500 bg-clay-800">
        <FileTree
          onOpenVariant={handleOpenVariant}
          activeTabId={activeTabId}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={setActiveTabId}
          onClose={closeTab}
        />

        {/* Toolbar */}
        {activeTab && (
          <EditorToolbar
            label={activeTab.label}
            onLabelChange={(l) => updateLabel(activeTab.id, l)}
            onSave={handleSave}
            onRun={handleRunToggle}
            saving={saving}
            isDirty={activeTab.isDirty}
            previewMode={previewMode}
            onPreviewToggle={handleTogglePreview}
            onDiffToggle={handleToggleDiff}
            diffActive={diffActive}
            wordCount={wordCount}
            charCount={charCount}
          />
        )}

        {/* Editor + Preview */}
        {activeTab ? (
          <div className="flex-1 flex overflow-hidden">
            {diffActive ? (
              <DiffView
                leftContent={diffContent}
                rightContent={activeTab.content}
                leftTitle="Original"
                rightTitle="Current"
              />
            ) : (
              <>
                <div className={`${previewMode !== "off" ? "w-1/2" : "flex-1"} overflow-hidden p-2`}>
                  <EditorPane
                    content={activeTab.content}
                    onChange={(val) => updateContent(activeTab.id, val)}
                    readOnly={activeTab.variantId === "default"}
                  />
                </div>
                {previewMode !== "off" && (
                  <div className="w-1/2 overflow-hidden p-2 border-l border-clay-500">
                    <PreviewPane
                      content={activeTab.content}
                      skill={activeTab.skill}
                      mode={previewMode}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-clay-200">No file open</p>
              <p className="text-xs text-clay-300 mt-1">
                Select a skill variant from the file tree
              </p>
            </div>
          </div>
        )}

        {/* Run panel */}
        {activeTab && <RunPanel skill={activeTab.skill} />}
      </div>
    </div>
  );
}
