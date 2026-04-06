"use client";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const FRIENDLY_TERMS: Record<string, { label: string; tooltip: string }> = {
  enrichment: {
    label: "Data lookup",
    tooltip: "Automatically looks up data from external sources like Apollo, web search, or email finders.",
  },
  ai: {
    label: "AI analysis",
    tooltip: "Uses AI to analyze, summarize, or extract insights from your data.",
  },
  formula: {
    label: "Calculated field",
    tooltip: "Combines or transforms values from other columns using a formula.",
  },
  gate: {
    label: "Filter step",
    tooltip: "Checks a condition and only continues processing rows that pass.",
  },
  waterfall: {
    label: "Multi-source lookup",
    tooltip: "Tries multiple data sources in order until one succeeds.",
  },
  http: {
    label: "API call",
    tooltip: "Makes a custom HTTP request to an external API.",
  },
  lookup: {
    label: "Cross-reference",
    tooltip: "Looks up matching data from another table.",
  },
  script: {
    label: "Custom code",
    tooltip: "Runs a custom Python or JavaScript snippet.",
  },
  static: {
    label: "Fixed value",
    tooltip: "A column with a constant value for every row.",
  },
  write: {
    label: "Write-back",
    tooltip: "Writes data back to an external system.",
  },
};

interface FriendlyTermProps {
  term: string;
  showOriginal?: boolean;
}

/**
 * Renders a technical term with a friendly label and explanatory tooltip.
 * Falls back to the original term if no mapping exists.
 */
export function FriendlyTerm({ term, showOriginal }: FriendlyTermProps) {
  const mapping = FRIENDLY_TERMS[term.toLowerCase()];

  if (!mapping) {
    return <span>{term}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dotted border-clay-500">
          {mapping.label}
          {showOriginal && (
            <span className="text-clay-400 ml-1">({term})</span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs">{mapping.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Get the friendly label for a column type (without tooltip).
 */
export function getFriendlyLabel(term: string): string {
  return FRIENDLY_TERMS[term.toLowerCase()]?.label || term;
}
