"use client";

import { OutputView } from "@/components/functions/output-view";

interface GenericOutputProps {
  result: Record<string, unknown>;
}

export function GenericOutput({ result }: GenericOutputProps) {
  return <OutputView result={result} />;
}
