"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ResearchOutputProps {
  result: Record<string, unknown>;
}

export function ResearchOutput({ result }: ResearchOutputProps) {
  const summary = String(result.summary || "");
  const keyFindings = asStringArray(
    result.key_findings || result.highlights || []
  );
  const sections = result.sections as
    | Record<string, unknown>[]
    | Record<string, unknown>
    | undefined;
  const sources = asStringArray(result.sources || []);
  const confidence =
    typeof result.confidence_score === "number"
      ? result.confidence_score
      : null;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-start gap-2">
        <BookOpen className="h-4 w-4 text-kiln-teal shrink-0 mt-0.5" />
        <p className="text-sm text-clay-100 leading-relaxed">{summary}</p>
      </div>

      {/* Confidence badge */}
      {confidence !== null && (
        <Badge
          variant="outline"
          className={`text-[10px] border-clay-600 ${
            confidence >= 0.7
              ? "text-emerald-400 border-emerald-400/30"
              : confidence >= 0.4
                ? "text-amber-400 border-amber-400/30"
                : "text-red-400 border-red-400/30"
          }`}
        >
          {Math.round(confidence * 100)}% confidence
        </Badge>
      )}

      {/* Key findings */}
      {keyFindings.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-clay-200 mb-2">
            Key Findings
          </h5>
          <ul className="space-y-1.5">
            {keyFindings.map((finding, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-clay-200"
              >
                <span className="text-kiln-teal mt-1.5 shrink-0 h-1 w-1 rounded-full bg-kiln-teal" />
                {finding}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sections */}
      {sections && <SectionsView sections={sections} />}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="border-t border-clay-700 pt-3">
          <h5 className="text-xs font-semibold text-clay-300 mb-1.5">
            Sources
          </h5>
          <div className="space-y-1">
            {sources.map((src, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs text-clay-300"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {src.startsWith("http") ? (
                  <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-kiln-teal hover:underline truncate"
                  >
                    {src}
                  </a>
                ) : (
                  <span className="truncate">{src}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extra fields */}
      <ExtraResearchFields
        result={result}
        exclude={[
          "summary",
          "key_findings",
          "highlights",
          "sections",
          "sources",
          "confidence_score",
        ]}
      />
    </div>
  );
}

function SectionsView({
  sections,
}: {
  sections: Record<string, unknown>[] | Record<string, unknown>;
}) {
  // Handle both array of {title, content} and object {key: value}
  const items: { title: string; content: string }[] = [];

  if (Array.isArray(sections)) {
    for (const s of sections) {
      items.push({
        title: String(s.title || s.name || s.heading || "Section"),
        content: String(s.content || s.body || s.text || JSON.stringify(s)),
      });
    }
  } else if (typeof sections === "object") {
    for (const [key, val] of Object.entries(sections)) {
      items.push({
        title: key,
        content: typeof val === "string" ? val : JSON.stringify(val),
      });
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <CollapsibleSection key={i} title={item.title} content={item.content} />
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded bg-clay-900/50 border border-clay-700">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-clay-700/30 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-clay-300 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-clay-300 shrink-0" />
        )}
        <span className="text-xs font-medium text-clay-200">{title}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <p className="text-sm text-clay-200 leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}

function ExtraResearchFields({
  result,
  exclude,
}: {
  result: Record<string, unknown>;
  exclude: string[];
}) {
  const excludeSet = new Set(exclude.map((k) => k.toLowerCase()));
  const extra = Object.entries(result).filter(
    ([k]) => !excludeSet.has(k.toLowerCase()) && !k.startsWith("_")
  );

  if (extra.length === 0) return null;

  return (
    <div className="border-t border-clay-700 pt-3 space-y-2">
      {extra.map(([key, value]) => (
        <div key={key} className="flex items-start gap-2 text-xs">
          <span className="font-mono text-clay-300 shrink-0">{key}:</span>
          <span className="text-clay-200 break-words">
            {typeof value === "object"
              ? JSON.stringify(value)
              : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
  }
  return [];
}
