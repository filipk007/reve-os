"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { formatDuration } from "@/lib/utils";

export interface StepTestResult {
  skill: string;
  success: boolean;
  duration_ms: number;
  output?: Record<string, unknown>;
  error?: string;
}

export function FlowStepTestOverlay({ result }: { result: StepTestResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2 pt-2 border-t border-clay-800"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        {result.success ? (
          <CheckCircle className="h-3.5 w-3.5 text-kiln-teal shrink-0" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-kiln-coral shrink-0" />
        )}
        <span
          className={`text-xs font-medium ${
            result.success ? "text-kiln-teal" : "text-kiln-coral"
          }`}
        >
          {result.success ? "Passed" : "Failed"}
        </span>
        {result.duration_ms > 0 && (
          <span className="text-xs text-clay-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(result.duration_ms)}
          </span>
        )}
        <span className="ml-auto">
          {expanded ? (
            <ChevronUp className="h-3 w-3 text-clay-500" />
          ) : (
            <ChevronDown className="h-3 w-3 text-clay-500" />
          )}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            {result.error && (
              <p className="text-xs text-kiln-coral mb-1">{result.error}</p>
            )}
            {result.output && (
              <pre className="text-xs text-clay-400 font-[family-name:var(--font-mono)] max-h-32 overflow-auto whitespace-pre-wrap rounded bg-clay-950 p-2">
                {JSON.stringify(result.output, null, 2)}
              </pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
