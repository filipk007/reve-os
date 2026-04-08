"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Sparkles } from "lucide-react";
import { TemplateCard } from "@/components/templates/template-card";
import { WORKFLOW_TEMPLATES } from "@/components/templates/template-data";
import type { WorkflowTemplate } from "@/lib/types";

interface TemplateGalleryProps {
  onSelect: (template: WorkflowTemplate) => void;
  compact?: boolean;
  limit?: number;
}

export function TemplateGallery({ onSelect, compact, limit }: TemplateGalleryProps) {
  const [search, setSearch] = useState("");

  const filtered = WORKFLOW_TEMPLATES.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.includes(q)
    );
  });

  const displayed = limit ? filtered.slice(0, limit) : filtered;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-clay-300" />
        <h3 className="text-xs font-semibold text-clay-200 uppercase tracking-wider">
          Start from Template
        </h3>
      </div>

      {/* Search — hide in compact mode */}
      {!compact && WORKFLOW_TEMPLATES.length > 4 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-clay-300" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs bg-clay-700 border-clay-600"
          />
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {displayed.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={onSelect}
            compact={compact}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-clay-300 py-6">
          No templates match your search.
        </p>
      )}
    </div>
  );
}
