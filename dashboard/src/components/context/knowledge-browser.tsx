"use client";

import type { KnowledgeBaseFile } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  frameworks: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  voice: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  industries: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

interface KnowledgeBrowserProps {
  files: Record<string, KnowledgeBaseFile[]>;
  onSelect: (file: KnowledgeBaseFile) => void;
}

export function KnowledgeBrowser({ files, onSelect }: KnowledgeBrowserProps) {
  const categories = Object.keys(files).sort();

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-clay-500">
        No knowledge base files found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-clay-300 capitalize mb-3">
            {category}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {files[category].map((file) => (
              <Card
                key={file.path}
                className="bg-clay-900 border-clay-800 p-4 hover:border-clay-700 transition-colors cursor-pointer"
                onClick={() => onSelect(file)}
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-clay-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-clay-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-clay-500 font-mono mt-0.5">
                      {file.path}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={`mt-3 text-xs ${
                    CATEGORY_COLORS[category] ||
                    "bg-clay-800 text-clay-300 border-clay-700"
                  }`}
                >
                  {category}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
