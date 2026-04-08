"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  Sparkles,
  Settings2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isOnboardingCompleted,
  completeOnboarding,
  setPersona,
} from "@/lib/user-preferences";
import type { UserPersona } from "@/lib/user-preferences";

export function WelcomeDialog() {
  const [open, setOpen] = useState(() => !isOnboardingCompleted());
  const [step, setStep] = useState(0);
  const [selectedPersona, setSelectedPersona] = useState<UserPersona | null>(null);

  const handleSelectPersona = (persona: UserPersona) => {
    setSelectedPersona(persona);
    setPersona(persona);
  };

  const handleFinish = () => {
    completeOnboarding();
    setOpen(false);
  };

  const handleSkip = () => {
    setPersona(selectedPersona || "rep");
    completeOnboarding();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip(); }}>
      <DialogContent className="sm:max-w-lg bg-clay-800 border-clay-600 p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Welcome to Webhook OS</DialogTitle>
          <DialogDescription>Set up your workspace</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-6 pt-5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full flex-1 transition-colors",
                i <= step ? "bg-kiln-teal" : "bg-clay-600"
              )}
            />
          ))}
        </div>

        <div className="px-6 pb-6 pt-4">
          {/* Step 0: Persona selection */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-semibold text-clay-100 mb-1">
                Welcome! How will you use this?
              </h2>
              <p className="text-sm text-clay-300 mb-5">
                We'll customize your experience based on your role.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <Card
                  onClick={() => handleSelectPersona("rep")}
                  className={cn(
                    "cursor-pointer transition-all border-2",
                    selectedPersona === "rep"
                      ? "border-kiln-teal bg-kiln-teal/5"
                      : "border-clay-600 hover:border-clay-500"
                  )}
                >
                  <CardContent className="p-4 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-kiln-teal" />
                    <h3 className="text-sm font-semibold text-clay-100 mb-1">
                      Sales Rep
                    </h3>
                    <p className="text-[11px] text-clay-300 leading-relaxed">
                      I want to upload lists and get enriched data back.
                    </p>
                  </CardContent>
                </Card>

                <Card
                  onClick={() => handleSelectPersona("power")}
                  className={cn(
                    "cursor-pointer transition-all border-2",
                    selectedPersona === "power"
                      ? "border-kiln-teal bg-kiln-teal/5"
                      : "border-clay-600 hover:border-clay-500"
                  )}
                >
                  <CardContent className="p-4 text-center">
                    <Settings2 className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                    <h3 className="text-sm font-semibold text-clay-100 mb-1">
                      Builder
                    </h3>
                    <p className="text-[11px] text-clay-300 leading-relaxed">
                      I want to create and customize functions and workflows.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="text-xs text-clay-300 hover:text-clay-200 transition-colors"
                >
                  Skip for now
                </button>
                <Button
                  size="sm"
                  disabled={!selectedPersona}
                  onClick={() => setStep(1)}
                  className="bg-kiln-teal text-black hover:bg-kiln-teal/90"
                >
                  Continue
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Quick orientation */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-clay-100 mb-1">
                You're all set!
              </h2>
              <p className="text-sm text-clay-300 mb-5">
                {selectedPersona === "rep"
                  ? "Here's how to get started with your first enrichment."
                  : "You have full access to all builder tools."}
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-kiln-teal/10 text-kiln-teal shrink-0 mt-0.5">
                    <span className="text-xs font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-clay-100">
                      {selectedPersona === "rep" ? "Upload a CSV" : "Create a function"}
                    </p>
                    <p className="text-xs text-clay-300">
                      {selectedPersona === "rep"
                        ? "Start by importing a list of prospects with company domains or names."
                        : "Build reusable functions that combine API tools and AI processing."}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-kiln-teal/10 text-kiln-teal shrink-0 mt-0.5">
                    <span className="text-xs font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-clay-100">
                      {selectedPersona === "rep" ? "Pick a template" : "Add steps"}
                    </p>
                    <p className="text-xs text-clay-300">
                      {selectedPersona === "rep"
                        ? "Choose from templates like Find Emails, Research Companies, or Score Leads."
                        : "Add enrichment tools, AI prompts, formulas, and gates to your pipeline."}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-kiln-teal/10 text-kiln-teal shrink-0 mt-0.5">
                    <span className="text-xs font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-clay-100">
                      Run & export
                    </p>
                    <p className="text-xs text-clay-300">
                      Hit Run and watch results fill in. Export as CSV or send to review.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(0)}
                  className="text-xs text-clay-300 hover:text-clay-200 transition-colors"
                >
                  Back
                </button>
                <Button
                  size="sm"
                  onClick={handleFinish}
                  className="bg-kiln-teal text-black hover:bg-kiln-teal/90"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Get started
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
