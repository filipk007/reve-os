"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Building2,
  Mail,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowTemplate } from "@/lib/types";

const ICON_MAP: Record<string, typeof Mail> = {
  Mail,
  Building2,
  Target,
  Users,
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  enrichment: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  research: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  scoring: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  outbound: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
};

interface TemplateCardProps {
  template: WorkflowTemplate;
  onSelect: (template: WorkflowTemplate) => void;
  compact?: boolean;
}

export function TemplateCard({ template, onSelect, compact }: TemplateCardProps) {
  const Icon = ICON_MAP[template.icon] || Mail;
  const style = CATEGORY_STYLES[template.category] || CATEGORY_STYLES.enrichment;

  return (
    <Card
      className={cn(
        "border-clay-600 hover:border-clay-500 cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:shadow-black/20 group"
      )}
      onClick={() => onSelect(template)}
    >
      <CardContent className={cn("flex flex-col", compact ? "p-4" : "p-5")}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={cn(
              "flex items-center justify-center rounded-xl shrink-0",
              style.bg, style.text,
              compact ? "w-8 h-8" : "w-10 h-10"
            )}
          >
            <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-clay-100 mb-0.5">
              {template.name}
            </h4>
            {!compact && (
              <p className="text-xs text-clay-300 leading-relaxed line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
        </div>

        {/* Input / Output badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-1 flex-wrap">
            {template.expected_inputs.slice(0, 3).map((input) => (
              <Badge
                key={input.name}
                variant="outline"
                className="text-[10px] border-kiln-teal/30 text-kiln-teal bg-kiln-teal/5"
              >
                {input.name.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
          <ArrowRight className="h-3 w-3 text-clay-300 shrink-0" />
          <div className="flex items-center gap-1 flex-wrap">
            {template.produced_outputs.slice(0, 3).map((output) => (
              <Badge
                key={output.name}
                variant="outline"
                className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
              >
                {output.name.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full text-clay-300 hover:text-kiln-teal hover:bg-kiln-teal/10",
            "opacity-70 group-hover:opacity-100 transition-opacity"
          )}
        >
          Use this template
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
