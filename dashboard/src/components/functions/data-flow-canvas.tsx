"use client";

import { useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Blocks, Plus, Wrench } from "lucide-react";
import type {
  FunctionInput,
  FunctionOutput,
  FunctionStep,
  ToolCategory,
  ToolDefinition,
  VariableInfo,
  DataFlowEdge,
  SchemaIssue,
} from "@/lib/types";
import { StepNode } from "./step-node";
import { InputFieldsNode } from "./input-fields-node";
import { OutputFieldsNode } from "./output-fields-node";
import { HorizontalConnector } from "./horizontal-connector";
import { DataFlowConnections } from "./data-flow-connections";

interface DataFlowCanvasProps {
  // Data
  inputs: FunctionInput[];
  outputs: FunctionOutput[];
  steps: FunctionStep[];
  toolMap: Record<string, ToolDefinition>;
  toolCategories: ToolCategory[];
  inputUsageMap: Record<string, number[]>;
  stepInputMap: Record<number, string[]>;
  dataFlowEdges: DataFlowEdge[];
  schemaIssues: SchemaIssue[];

  // State
  editing: boolean;
  expandedSteps: Set<number>;
  editingStepIdx: number | null;
  catalogOpen: boolean;

  // Variable resolver
  availableVariables: (stepIndex: number) => VariableInfo[];

  // Setters
  setInputs: (v: FunctionInput[]) => void;
  setOutputs: (v: FunctionOutput[]) => void;
  setSteps: (v: FunctionStep[]) => void;
  setCatalogOpen: (v: boolean) => void;
  setEditingStepIdx: (v: number | null) => void;
  toggleStepExpanded: (i: number) => void;
}

export function DataFlowCanvas({
  inputs,
  outputs,
  steps,
  toolMap,
  toolCategories,
  inputUsageMap,
  stepInputMap,
  dataFlowEdges,
  schemaIssues,
  editing,
  expandedSteps,
  editingStepIdx,
  catalogOpen,
  availableVariables,
  setInputs,
  setOutputs,
  setSteps,
  setCatalogOpen,
  setEditingStepIdx,
  toggleStepExpanded,
}: DataFlowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const stepIds = steps.map((_, i) => `step-${i}`);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = stepIds.indexOf(active.id as string);
      const newIndex = stepIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      setSteps(arrayMove(steps, oldIndex, newIndex));

      // Adjust editingStepIdx if needed
      if (editingStepIdx !== null) {
        if (editingStepIdx === oldIndex) {
          setEditingStepIdx(newIndex);
        } else if (oldIndex < editingStepIdx && newIndex >= editingStepIdx) {
          setEditingStepIdx(editingStepIdx - 1);
        } else if (oldIndex > editingStepIdx && newIndex <= editingStepIdx) {
          setEditingStepIdx(editingStepIdx + 1);
        }
      }
    },
    [steps, stepIds, setSteps, editingStepIdx, setEditingStepIdx]
  );

  // Input/output CRUD helpers
  const addInput = () => {
    setInputs([...inputs, { name: "", type: "string", required: true, description: "" }]);
  };
  const removeInput = (i: number) => {
    setInputs(inputs.filter((_, idx) => idx !== i));
  };
  const updateInput = (i: number, field: keyof FunctionInput, value: string | boolean) => {
    const updated = [...inputs];
    (updated[i] as unknown as Record<string, unknown>)[field] = value;
    setInputs(updated);
  };

  const addOutput = () => {
    setOutputs([...outputs, { key: "", type: "string", description: "" }]);
  };
  const removeOutput = (i: number) => {
    setOutputs(outputs.filter((_, idx) => idx !== i));
  };
  const updateOutput = (i: number, field: keyof FunctionOutput, value: string) => {
    const updated = [...outputs];
    (updated[i] as unknown as Record<string, unknown>)[field] = value;
    setOutputs(updated);
  };

  // Step CRUD helpers
  const addStep = (tool?: string) => {
    setSteps([...steps, { tool: tool || "", params: {} }]);
    setCatalogOpen(false);
  };
  const insertStep = (atIndex: number) => {
    const updated = [...steps];
    updated.splice(atIndex, 0, { tool: "", params: {} });
    setSteps(updated);
  };
  const removeStep = (i: number) => {
    setSteps(steps.filter((_, idx) => idx !== i));
    if (editingStepIdx === i) setEditingStepIdx(null);
  };
  const updateStepTool = (i: number, tool: string) => {
    const updated = [...steps];
    const toolDef = toolMap[tool];
    // Auto-populate params from tool inputs
    const autoParams: Record<string, string> = {};
    if (toolDef?.inputs) {
      toolDef.inputs.forEach((inp) => {
        autoParams[inp.name] = "";
      });
    }
    updated[i] = { ...updated[i], tool, params: { ...autoParams, ...updated[i].params } };
    setSteps(updated);
  };
  const updateStepParam = (stepIdx: number, key: string, value: string, oldKey?: string) => {
    const updated = [...steps];
    const params = { ...updated[stepIdx].params };
    if (oldKey && oldKey !== key) {
      delete params[oldKey];
    }
    params[key] = value;
    updated[stepIdx] = { ...updated[stepIdx], params };
    setSteps(updated);
  };
  const removeStepParam = (stepIdx: number, key: string) => {
    const updated = [...steps];
    const params = { ...updated[stepIdx].params };
    delete params[key];
    updated[stepIdx] = { ...updated[stepIdx], params };
    setSteps(updated);
  };
  const addStepParam = (stepIdx: number) => {
    const updated = [...steps];
    const params = { ...updated[stepIdx].params };
    let newKey = "param";
    let n = 1;
    while (params[newKey]) {
      newKey = `param${n++}`;
    }
    params[newKey] = "";
    updated[stepIdx] = { ...updated[stepIdx], params };
    setSteps(updated);
  };

  // Check if any edge to a step is unresolved
  const stepHasUnresolved = (stepIdx: number) =>
    dataFlowEdges.some(
      (e) => e.toNodeId === `step-${stepIdx}` && !e.resolved
    );

  return (
    <div className="lg:col-span-2">
      {/* Canvas header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-clay-200 flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Pipeline ({steps.length} step{steps.length !== 1 ? "s" : ""})
        </h3>
        {editing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCatalogOpen(!catalogOpen)}
              className="text-clay-300 h-7 text-xs"
            >
              <Blocks className="h-3 w-3 mr-1" /> Browse Tools
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addStep()}
              className="text-clay-300 h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Step
            </Button>
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto rounded-lg border border-clay-600 bg-clay-900/30 p-4"
      >
        <DataFlowConnections
          edges={dataFlowEdges}
          containerRef={containerRef}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-0 min-h-[120px]">
          {/* Inputs node */}
          <div data-node-id="inputs">
            <InputFieldsNode
              inputs={inputs}
              editing={editing}
              inputUsageMap={inputUsageMap}
              onAdd={addInput}
              onRemove={removeInput}
              onUpdate={updateInput}
            />
          </div>

          <HorizontalConnector
            editing={editing}
            onInsert={() => insertStep(0)}
          />

          {/* Steps */}
          {steps.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="text-center">
                <Wrench className="h-8 w-8 text-clay-300 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-clay-300 mb-2">
                  No steps yet
                </p>
                {editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addStep()}
                    className="border-clay-600 text-clay-300 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add your first step
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={stepIds}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-0">
                  <AnimatePresence mode="popLayout">
                    {steps.map((step, i) => (
                      <div
                        key={stepIds[i]}
                        className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-0"
                      >
                        <div data-node-id={`step-${i}`}>
                          <StepNode
                            step={step}
                            index={i}
                            total={steps.length}
                            id={stepIds[i]}
                            editing={editing}
                            toolDef={toolMap[step.tool]}
                            toolCategories={toolCategories}
                            availableVars={availableVariables(i)}
                            wiredInputs={stepInputMap[i] || []}
                            isExpanded={expandedSteps.has(i)}
                            isEditingParams={editing && editingStepIdx === i}
                            onToggleExpand={() => toggleStepExpanded(i)}
                            onToggleParamEdit={() =>
                              setEditingStepIdx(editingStepIdx === i ? null : i)
                            }
                            onUpdateTool={(tool) => updateStepTool(i, tool)}
                            onUpdateParam={(key, val, oldKey) =>
                              updateStepParam(i, key, val, oldKey)
                            }
                            onRemoveParam={(key) => removeStepParam(i, key)}
                            onAddParam={() => addStepParam(i)}
                            onRemove={() => removeStep(i)}
                          />
                        </div>

                        {i < steps.length - 1 && (
                          <HorizontalConnector
                            editing={editing}
                            onInsert={() => insertStep(i + 1)}
                            hasUnresolved={stepHasUnresolved(i + 1)}
                          />
                        )}
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>
          )}

          <HorizontalConnector editing={false} />

          {/* Outputs node */}
          <div data-node-id="outputs">
            <OutputFieldsNode
              outputs={outputs}
              editing={editing}
              schemaIssues={schemaIssues}
              onAdd={addOutput}
              onRemove={removeOutput}
              onUpdate={updateOutput}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
