"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Play,
  Eye,
  EyeOff,
  GitCompare,
  Loader2,
  FileCode,
  Sparkles,
} from "lucide-react";

export type PreviewMode = "off" | "markdown" | "assembled";

export function EditorToolbar({
  label,
  onLabelChange,
  onSave,
  onRun,
  saving,
  isDirty,
  previewMode,
  onPreviewToggle,
  onDiffToggle,
  diffActive,
  wordCount,
  charCount,
}: {
  label: string;
  onLabelChange: (label: string) => void;
  onSave: () => void;
  onRun: () => void;
  saving: boolean;
  isDirty: boolean;
  previewMode: PreviewMode;
  onPreviewToggle: () => void;
  onDiffToggle: () => void;
  diffActive: boolean;
  wordCount: number;
  charCount: number;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-clay-500 bg-clay-800/50">
      <Input
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="Variant label..."
        className="h-7 w-40 text-xs border-clay-700 bg-clay-950 text-clay-200 placeholder:text-clay-300"
      />

      <div className="w-px h-4 bg-clay-800" />

      <Button
        variant="outline"
        size="sm"
        onClick={onSave}
        disabled={saving || !isDirty}
        className="h-7 text-xs border-clay-700 text-clay-300 hover:text-kiln-teal hover:border-kiln-teal/30"
      >
        {saving ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Save className="h-3 w-3 mr-1" />
        )}
        Save
        <kbd className="hidden md:inline-block ml-1.5 text-[9px] opacity-50 border border-clay-700 rounded px-1">
          {"\u2318"}S
        </kbd>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onRun}
        className="h-7 text-xs border-clay-700 text-clay-300 hover:text-kiln-teal hover:border-kiln-teal/30"
      >
        <Play className="h-3 w-3 mr-1" />
        Run
        <kbd className="hidden md:inline-block ml-1.5 text-[9px] opacity-50 border border-clay-700 rounded px-1">
          {"\u2318\u21A9"}
        </kbd>
      </Button>

      <div className="w-px h-4 bg-clay-800" />

      <Button
        variant={previewMode !== "off" ? "default" : "outline"}
        size="sm"
        onClick={onPreviewToggle}
        className={`h-7 text-xs ${
          previewMode !== "off"
            ? "bg-kiln-teal/10 text-kiln-teal border-kiln-teal/30"
            : "border-clay-700 text-clay-200"
        }`}
      >
        {previewMode !== "off" ? (
          <Eye className="h-3 w-3 mr-1" />
        ) : (
          <EyeOff className="h-3 w-3 mr-1" />
        )}
        {previewMode === "assembled" ? "Prompt" : "Preview"}
      </Button>

      <Button
        variant={diffActive ? "default" : "outline"}
        size="sm"
        onClick={onDiffToggle}
        className={`h-7 text-xs ${
          diffActive
            ? "bg-kiln-teal/10 text-kiln-teal border-kiln-teal/30"
            : "border-clay-700 text-clay-200"
        }`}
      >
        <GitCompare className="h-3 w-3 mr-1" />
        Diff
      </Button>

      <div className="ml-auto flex items-center gap-3 text-[10px] text-clay-300">
        <span>{wordCount} words</span>
        <span>{charCount} chars</span>
      </div>
    </div>
  );
}
