"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import type { PipelineStepConfig } from "@/lib/types";
import { MODELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Settings2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { FlowStepTestOverlay, type StepTestResult } from "./flow-step-test-overlay";

function getAccentColor(index: number, total: number): string {
  if (total <= 1) return "border-l-kiln-teal";
  if (index === 0) return "border-l-kiln-teal";
  if (index === total - 1) return "border-l-kiln-mustard";
  return "border-l-kiln-teal/60";
}

export function PipelineStepCard({
  step,
  index,
  total,
  id,
  onChange,
  onRemove,
  testResult,
}: {
  step: PipelineStepConfig;
  index: number;
  total: number;
  id: string;
  onChange: (updated: PipelineStepConfig) => void;
  onRemove: () => void;
  testResult?: StepTestResult | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasConfig = !!(step.model || step.instructions || step.condition || step.confidence_field);
  const accentColor = getAccentColor(index, total);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-lg border bg-clay-900 border-l-[3px] ${accentColor} ${
          isDragging
            ? "border-kiln-teal/50 bg-clay-800 shadow-lg z-10 opacity-50"
            : "border-clay-800"
        }`}
      >
        {/* Collapsed header — taller (h-[72px] equivalent via py-5) */}
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-clay-600 hover:text-clay-400 shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Circular step number badge */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-kiln-teal/10 border border-kiln-teal/30 shrink-0">
            <span className="text-sm font-bold text-kiln-teal font-[family-name:var(--font-mono)]">
              {index + 1}
            </span>
          </div>

          <span className="font-medium text-clay-200 flex-1 text-sm">{step.skill}</span>

          {hasConfig && (
            <Settings2 className="h-3.5 w-3.5 text-kiln-mustard shrink-0" />
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-clay-500 hover:text-clay-200"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-clay-500 hover:text-kiln-coral"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Expanded config */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 border-t border-clay-800 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-clay-500 mb-1 block">
                      Model Override
                    </label>
                    <Select
                      value={step.model || "default"}
                      onValueChange={(v) =>
                        onChange({ ...step, model: v === "default" ? null : v })
                      }
                    >
                      <SelectTrigger className="border-clay-700 bg-clay-950 text-clay-200 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-clay-700 bg-clay-900">
                        <SelectItem value="default">Pipeline default</SelectItem>
                        {MODELS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-clay-500 mb-1 block">
                      Confidence Field
                    </label>
                    <Input
                      value={step.confidence_field || ""}
                      onChange={(e) =>
                        onChange({
                          ...step,
                          confidence_field: e.target.value || null,
                        })
                      }
                      placeholder="e.g., confidence_score"
                      className="h-8 text-sm border-clay-700 bg-clay-950 text-clay-200 placeholder:text-clay-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-clay-500 mb-1 block">
                    Condition
                  </label>
                  <Input
                    value={step.condition || ""}
                    onChange={(e) =>
                      onChange({
                        ...step,
                        condition: e.target.value || null,
                      })
                    }
                    placeholder="e.g., prev.icp_score >= 7"
                    className="h-8 text-sm border-clay-700 bg-clay-950 text-clay-200 placeholder:text-clay-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-clay-500 mb-1 block">
                    Step Instructions
                  </label>
                  <Textarea
                    value={step.instructions || ""}
                    onChange={(e) =>
                      onChange({
                        ...step,
                        instructions: e.target.value || null,
                      })
                    }
                    placeholder="Optional instructions for this step..."
                    className="h-16 border-clay-700 bg-clay-950 text-clay-200 placeholder:text-clay-600 text-sm resize-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Test result overlay */}
        {testResult && (
          <div className="px-4 pb-3">
            <FlowStepTestOverlay result={testResult} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
