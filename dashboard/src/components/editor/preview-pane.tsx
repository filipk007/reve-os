"use client";

import { useState, useEffect } from "react";
import { previewPrompt } from "@/lib/api";
import type { PromptPreview } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type PreviewMode = "markdown" | "assembled";

export function PreviewPane({
  content,
  skill,
  mode,
}: {
  content: string;
  skill: string;
  mode: PreviewMode;
}) {
  const [assembled, setAssembled] = useState<PromptPreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "assembled" || !skill) return;
    setLoading(true);
    previewPrompt({ skill, client_slug: "" })
      .then(setAssembled)
      .catch(() => setAssembled(null))
      .finally(() => setLoading(false));
  }, [mode, skill]);

  return (
    <div className="h-full overflow-auto bg-clay-950 rounded-lg border border-clay-800 p-4">
      {mode === "markdown" && (
        <div className="prose prose-invert prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-clay-300 font-[family-name:var(--font-mono)] leading-6">
            {content}
          </pre>
        </div>
      )}

      {mode === "assembled" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-clay-500" />
            </div>
          ) : assembled ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-kiln-teal/10 text-kiln-teal border-kiln-teal/30 text-[10px]"
                >
                  ~{assembled.estimated_tokens} tokens
                </Badge>
                <span className="text-[10px] text-clay-500">
                  {assembled.context_files_loaded.length} context files
                </span>
              </div>
              {assembled.context_files_loaded.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {assembled.context_files_loaded.map((f) => (
                    <Badge
                      key={f}
                      variant="outline"
                      className="text-[10px] text-clay-500 border-clay-700"
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              )}
              <pre className="whitespace-pre-wrap text-sm text-clay-300 font-[family-name:var(--font-mono)] leading-6 mt-3">
                {assembled.assembled_prompt}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-clay-500 text-center py-12">
              Unable to load assembled prompt preview.
            </p>
          )}
        </>
      )}
    </div>
  );
}
