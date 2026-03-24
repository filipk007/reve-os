"use client";

import { detectOutputType } from "@/lib/output-detection";
import { EmailOutput } from "./email-output";
import { ResearchOutput } from "./research-output";
import { ScoreOutput } from "./score-output";
import { GenericOutput } from "./generic-output";

interface OutputRendererProps {
  result: Record<string, unknown>;
}

const RENDERERS = {
  email: EmailOutput,
  research: ResearchOutput,
  score: ScoreOutput,
  generic: GenericOutput,
} as const;

export function OutputRenderer({ result }: OutputRendererProps) {
  const outputType = detectOutputType(result);
  const Component = RENDERERS[outputType];
  return <Component result={result} />;
}
