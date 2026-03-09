"use client";

import { useEffect, useCallback } from "react";
import { useEmailLab } from "@/hooks/use-email-lab";
import { TemplatePanel } from "./template-panel";
import { DataEditorPanel } from "./data-editor-panel";
import { EmailPreviewPanel } from "./email-preview-panel";

export function EmailLabContent() {
  const lab = useEmailLab();

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd+Enter → Run
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!lab.loading) lab.runEmail();
      }
      // Cmd+S → Save skill (when on skill tab)
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        if (lab.activeTab === "skill") {
          e.preventDefault();
          lab.saveSkillContent();
        }
      }
    },
    [lab]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-full min-h-0">
      {/* Left panel — Templates & Skills */}
      <div className="w-64 shrink-0 border-r border-clay-700 hidden lg:block">
        <TemplatePanel
          selectedTemplateId={lab.selectedTemplate?.id ?? null}
          onSelectTemplate={lab.selectTemplate}
          selectedSkill={lab.selectedSkill}
          onSelectSkill={lab.setSelectedSkill}
          selectedModel={lab.selectedModel}
          onSelectModel={lab.setSelectedModel}
          variants={lab.variants}
          selectedVariant={lab.selectedVariant}
          onSelectVariant={lab.setSelectedVariant}
          onFork={lab.forkCurrentSkill}
        />
      </div>

      {/* Center panel — Data Editor */}
      <div className="flex-1 min-w-0 border-r border-clay-700">
        <DataEditorPanel
          activeTab={lab.activeTab}
          onTabChange={lab.setActiveTab}
          dataJson={lab.dataJson}
          onDataChange={lab.setDataJson}
          instructions={lab.instructions}
          onInstructionsChange={lab.setInstructions}
          skillContent={lab.skillContent}
          onSkillContentChange={lab.setSkillContent}
          skillLoading={lab.skillLoading}
          onSaveSkill={lab.saveSkillContent}
          onRun={lab.runEmail}
          loading={lab.loading}
          selectedModel={lab.selectedModel}
        />
      </div>

      {/* Right panel — Email Preview */}
      <div className="w-80 xl:w-96 shrink-0 hidden md:block">
        <EmailPreviewPanel
          result={lab.result}
          loading={lab.loading}
          error={lab.error}
          history={lab.history}
          onRestore={lab.restoreRun}
          onClearHistory={lab.clearHistory}
        />
      </div>
    </div>
  );
}
