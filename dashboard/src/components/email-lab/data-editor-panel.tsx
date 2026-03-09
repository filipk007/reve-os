"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EditorPane } from "@/components/editor/editor-pane";
import { Play, Loader2, Save, Cpu } from "lucide-react";
import type { EditorTab } from "@/hooks/use-email-lab";

const TABS: { id: EditorTab; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "instructions", label: "Instructions" },
  { id: "skill", label: "Skill Prompt" },
];

export function DataEditorPanel({
  activeTab,
  onTabChange,
  dataJson,
  onDataChange,
  instructions,
  onInstructionsChange,
  skillContent,
  onSkillContentChange,
  skillLoading,
  onSaveSkill,
  onRun,
  loading,
  selectedModel,
}: {
  activeTab: EditorTab;
  onTabChange: (t: EditorTab) => void;
  dataJson: string;
  onDataChange: (v: string) => void;
  instructions: string;
  onInstructionsChange: (v: string) => void;
  skillContent: string;
  onSkillContentChange: (v: string) => void;
  skillLoading: boolean;
  onSaveSkill: () => void;
  onRun: () => void;
  loading: boolean;
  selectedModel: string;
}) {
  // Validate JSON for visual feedback
  let jsonValid = true;
  try {
    JSON.parse(dataJson);
  } catch {
    jsonValid = false;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-clay-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeTab === tab.id
                ? "bg-clay-700 text-clay-100"
                : "text-clay-300 hover:text-clay-200 hover:bg-clay-800"
            )}
          >
            {tab.label}
          </button>
        ))}

        {/* Save button for skill tab */}
        {activeTab === "skill" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveSkill}
            className="ml-auto text-xs text-clay-300 hover:text-kiln-teal h-7"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Save
            <kbd className="ml-1.5 text-[10px] text-clay-300 bg-clay-800 px-1 rounded">
              {"\u2318"}S
            </kbd>
          </Button>
        )}

        {/* JSON validity indicator for data tab */}
        {activeTab === "data" && (
          <div className="ml-auto flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                jsonValid ? "bg-emerald-400" : "bg-red-400"
              )}
            />
            <span className="text-[10px] text-clay-300">
              {jsonValid ? "Valid JSON" : "Invalid JSON"}
            </span>
          </div>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden p-3">
        {activeTab === "data" && (
          <div className="h-full">
            <textarea
              value={dataJson}
              onChange={(e) => onDataChange(e.target.value)}
              spellCheck={false}
              className={cn(
                "w-full h-full resize-none bg-clay-950 border rounded-lg p-4 text-sm text-clay-200 font-[family-name:var(--font-mono)] leading-relaxed outline-none",
                jsonValid
                  ? "border-clay-700 focus:border-kiln-teal/50"
                  : "border-red-500/50 focus:border-red-400"
              )}
              placeholder='{\n  "first_name": "...",\n  "company_name": "..."\n}'
            />
          </div>
        )}

        {activeTab === "instructions" && (
          <textarea
            value={instructions}
            onChange={(e) => onInstructionsChange(e.target.value)}
            spellCheck={false}
            className="w-full h-full resize-none bg-clay-950 border border-clay-700 rounded-lg p-4 text-sm text-clay-200 leading-relaxed outline-none focus:border-kiln-teal/50"
            placeholder="Optional campaign overrides... e.g. 'Keep under 80 words, focus on the funding signal, use a question-based opener'"
          />
        )}

        {activeTab === "skill" && (
          <div className="h-full">
            {skillLoading ? (
              <div className="h-full flex items-center justify-center text-clay-300">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <EditorPane
                content={skillContent}
                onChange={onSkillContentChange}
              />
            )}
          </div>
        )}
      </div>

      {/* Run button */}
      <div className="px-3 pb-3 pt-1">
        <Button
          onClick={onRun}
          disabled={loading || (activeTab === "data" && !jsonValid)}
          className="w-full bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light font-semibold h-10 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run
              <span className="ml-2 flex items-center gap-1 text-clay-950/60">
                <Cpu className="h-3 w-3" />
                {selectedModel}
              </span>
              <kbd className="ml-2 text-[10px] bg-clay-950/20 px-1.5 py-0.5 rounded">
                {"\u2318\u21A9"}
              </kbd>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
