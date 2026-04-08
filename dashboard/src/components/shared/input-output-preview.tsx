"use client";

import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface IOField {
  name: string;
  description?: string;
}

interface InputOutputPreviewProps {
  inputs: IOField[];
  outputs: IOField[];
  maxItems?: number;
}

export function InputOutputPreview({
  inputs,
  outputs,
  maxItems = 3,
}: InputOutputPreviewProps) {
  const displayInputs = inputs.slice(0, maxItems);
  const displayOutputs = outputs.slice(0, maxItems);

  if (displayInputs.length === 0 && displayOutputs.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Inputs */}
      <div className="flex items-center gap-1 flex-wrap">
        {displayInputs.map((f) => (
          <Badge
            key={f.name}
            variant="outline"
            className="text-[10px] border-kiln-teal/30 text-kiln-teal bg-kiln-teal/5 font-normal"
            title={f.description}
          >
            {f.name.replace(/_/g, " ")}
          </Badge>
        ))}
        {inputs.length > maxItems && (
          <span className="text-[10px] text-clay-300">+{inputs.length - maxItems}</span>
        )}
      </div>

      <ArrowRight className="h-2.5 w-2.5 text-clay-300 shrink-0" />

      {/* Outputs */}
      <div className="flex items-center gap-1 flex-wrap">
        {displayOutputs.map((f) => (
          <Badge
            key={f.name}
            variant="outline"
            className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5 font-normal"
            title={f.description}
          >
            {f.name.replace(/_/g, " ")}
          </Badge>
        ))}
        {outputs.length > maxItems && (
          <span className="text-[10px] text-clay-300">+{outputs.length - maxItems}</span>
        )}
      </div>
    </div>
  );
}
