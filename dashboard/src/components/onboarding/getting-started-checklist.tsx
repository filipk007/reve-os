"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, X, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { getChecklist, onPreferencesChanged } from "@/lib/user-preferences";
import type { OnboardingChecklist } from "@/lib/user-preferences";

const CHECKLIST_DISMISSED_KEY = "kiln_checklist_dismissed";

interface ChecklistItem {
  key: keyof OnboardingChecklist;
  label: string;
  description: string;
}

const ITEMS: ChecklistItem[] = [
  {
    key: "uploadedCsv",
    label: "Upload your first CSV",
    description: "Import a list of prospects to get started.",
  },
  {
    key: "ranEnrichment",
    label: "Run your first enrichment",
    description: "Add columns and hit Run to enrich your data.",
  },
  {
    key: "exportedResults",
    label: "Export your results",
    description: "Download your enriched data as CSV.",
  },
];

export function GettingStartedChecklist() {
  const [checklist, setChecklist] = useState<OnboardingChecklist>(getChecklist());
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(CHECKLIST_DISMISSED_KEY) === "true";
  });

  useEffect(() => {
    return onPreferencesChanged(() => setChecklist(getChecklist()));
  }, []);

  const completedCount = ITEMS.filter((item) => checklist[item.key]).length;
  const allDone = completedCount === ITEMS.length;

  // Don't show if dismissed or all completed
  if (dismissed || allDone) return null;

  const handleDismiss = () => {
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <Card className="border-clay-600 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-3.5 w-3.5 text-kiln-teal" />
            <h3 className="text-xs font-semibold text-clay-200 uppercase tracking-wider">
              Getting started
            </h3>
            <span className="text-[10px] text-clay-400">
              {completedCount}/{ITEMS.length}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-clay-400 hover:text-clay-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-clay-700 mb-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-kiln-teal transition-all duration-500"
            style={{ width: `${(completedCount / ITEMS.length) * 100}%` }}
          />
        </div>

        <div className="space-y-2">
          {ITEMS.map((item) => {
            const done = checklist[item.key];
            return (
              <div key={item.key} className="flex items-start gap-2.5">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-clay-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      done ? "text-clay-400 line-through" : "text-clay-100"
                    )}
                  >
                    {item.label}
                  </p>
                  {!done && (
                    <p className="text-[11px] text-clay-400">{item.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
