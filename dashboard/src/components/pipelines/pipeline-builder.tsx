"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import type { PipelineDefinition, PipelineStepConfig, PipelineTestResult } from "@/lib/types";
import { SkillPalette } from "./skill-palette";
import { PipelineStepCard } from "./pipeline-step-card";
import { FlowConnector } from "./flow-connector";
import { FlowDragOverlay } from "./flow-drag-overlay";
import { FlowEmptyState } from "./flow-empty-state";
import type { StepTestResult } from "./flow-step-test-overlay";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save } from "lucide-react";

export function PipelineBuilder({
  skills,
  initial,
  saving,
  onSave,
  testResults,
}: {
  skills: string[];
  initial?: PipelineDefinition | null;
  saving: boolean;
  onSave: (pipeline: {
    name: string;
    description: string;
    steps: PipelineStepConfig[];
    confidence_threshold?: number;
  }) => void;
  testResults?: PipelineTestResult | null;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    initial?.confidence_threshold ?? 0.7
  );
  const [steps, setSteps] = useState<(PipelineStepConfig & { _id: string })[]>(
    () =>
      (initial?.steps || []).map((s, i) => ({
        ...s,
        _id: `step-${i}-${Date.now()}`,
      }))
  );
  const [addSkill, setAddSkill] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      // Dropping from palette
      const fromPalette = active.data.current?.fromPalette;
      if (fromPalette) {
        const skill = active.data.current?.skill as string;
        setSteps((prev) => [
          ...prev,
          { skill, _id: `step-${Date.now()}-${Math.random()}` },
        ]);
        return;
      }

      // Reordering within list
      if (active.id !== over.id) {
        setSteps((prev) => {
          const oldIndex = prev.findIndex((s) => s._id === active.id);
          const newIndex = prev.findIndex((s) => s._id === over.id);
          if (oldIndex === -1 || newIndex === -1) return prev;
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
    },
    []
  );

  const handleAddStep = () => {
    if (!addSkill) return;
    setSteps((prev) => [
      ...prev,
      { skill: addSkill, _id: `step-${Date.now()}-${Math.random()}` },
    ]);
    setAddSkill("");
  };

  const handleInsertStep = (atIndex: number) => {
    // Open the skill selector or insert a placeholder
    if (!addSkill) return;
    setSteps((prev) => {
      const newStep = { skill: addSkill, _id: `step-${Date.now()}-${Math.random()}` };
      const next = [...prev];
      next.splice(atIndex, 0, newStep);
      return next;
    });
    setAddSkill("");
  };

  const handleStepChange = (id: string, updated: PipelineStepConfig) => {
    setSteps((prev) =>
      prev.map((s) => (s._id === id ? { ...updated, _id: s._id } : s))
    );
  };

  const handleRemoveStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s._id !== id));
  };

  const handleSave = () => {
    onSave({
      name,
      description,
      steps: steps.map(({ _id, ...rest }) => rest),
      confidence_threshold: confidenceThreshold,
    });
  };

  // Map test results to individual steps
  const getStepTestResult = (skill: string, index: number): StepTestResult | null => {
    if (!testResults?.steps) return null;
    const stepResult = testResults.steps[index];
    if (!stepResult || stepResult.skill !== skill) {
      // Try matching by skill name as fallback
      return testResults.steps.find((s) => s.skill === skill) || null;
    }
    return stepResult;
  };

  const activeStep = activeId ? steps.find((s) => s._id === activeId) : null;
  const activeIndex = activeStep ? steps.indexOf(activeStep) : -1;

  const isValid = name.length >= 2 && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name) && steps.length > 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Name, description, and confidence threshold */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-clay-500 uppercase tracking-wider mb-1.5 block">
              Pipeline Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="my-pipeline"
              disabled={!!initial}
              className="border-clay-700 bg-clay-900 text-clay-100 placeholder:text-clay-600 focus-visible:ring-kiln-teal/50"
            />
            {name && !(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name)) && (
              <p className="text-xs text-kiln-coral mt-1">
                Use lowercase letters, numbers, and hyphens. Must start/end with alphanumeric.
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-clay-500 uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Score leads then generate emails..."
              className="border-clay-700 bg-clay-900 text-clay-100 placeholder:text-clay-600 focus-visible:ring-kiln-teal/50"
            />
          </div>
          <div>
            <label className="text-xs text-clay-500 uppercase tracking-wider mb-1.5 block">
              Confidence Threshold
            </label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value) || 0)}
              className="border-clay-700 bg-clay-900 text-clay-100 placeholder:text-clay-600 focus-visible:ring-kiln-teal/50"
            />
          </div>
        </div>

        {/* Skill palette */}
        <SkillPalette skills={skills} />

        {/* Pipeline steps */}
        <div>
          <p className="text-xs text-clay-500 uppercase tracking-wider mb-3">
            Pipeline Steps ({steps.length})
          </p>

          <SortableContext
            items={steps.map((s) => s._id)}
            strategy={verticalListSortingStrategy}
          >
            <div>
              <AnimatePresence mode="popLayout">
                {steps.map((step, i) => (
                  <div key={step._id}>
                    {i > 0 && (
                      <FlowConnector
                        index={i}
                        onInsert={handleInsertStep}
                      />
                    )}
                    <PipelineStepCard
                      step={step}
                      index={i}
                      total={steps.length}
                      id={step._id}
                      onChange={(updated) => handleStepChange(step._id, updated)}
                      onRemove={() => handleRemoveStep(step._id)}
                      testResult={getStepTestResult(step.skill, i)}
                    />
                  </div>
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>

          {steps.length === 0 && <FlowEmptyState />}

          {/* Manual add */}
          <div className="flex items-center gap-2 mt-4">
            <Select value={addSkill} onValueChange={setAddSkill}>
              <SelectTrigger className="flex-1 border-clay-700 bg-clay-900 text-clay-200 h-9 text-sm">
                <SelectValue placeholder="Add a step..." />
              </SelectTrigger>
              <SelectContent className="border-clay-700 bg-clay-900">
                {skills.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={!addSkill}
              onClick={handleAddStep}
              className="border-clay-700 text-clay-300 h-9"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light font-semibold"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : initial ? "Update Pipeline" : "Create Pipeline"}
          </Button>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeStep ? (
          <FlowDragOverlay
            skillName={activeStep.skill}
            index={activeIndex}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
