"use client";

import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useFunctionBuilder } from "@/hooks/use-function-builder";
import { FunctionHeader } from "@/components/functions/function-header";
import { FunctionBuilder } from "@/components/functions/function-builder";
import { FunctionPlayground } from "@/components/functions/function-playground";
import { DataFlowCanvas } from "@/components/functions/data-flow-canvas";
import { LivePreviewPanel } from "@/components/functions/live-preview-panel";

export default function FunctionDetailPage() {
  const params = useParams();
  const funcId = params.id as string;
  const b = useFunctionBuilder(funcId);

  if (b.loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Function" />
        <div className="flex-1 flex items-center justify-center text-clay-300">
          Loading...
        </div>
      </div>
    );
  }

  if (!b.func) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <Header
          title={b.func.name}
          breadcrumbs={[
            { label: "Functions", href: "/" },
            { label: b.func.name },
          ]}
        />

        <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <FunctionHeader
            func={b.func}
            editing={b.editing}
            saving={b.saving}
            testOpen={b.testOpen}
            onToggleTest={() => b.setTestOpen(!b.testOpen)}
            onEdit={() => b.setEditing(true)}
            onCancelEdit={() => {
              b.setEditing(false);
              b.setEditingStepIdx(null);
              b.load();
            }}
            onSave={b.handleSave}
            onDelete={b.handleDelete}
          />

          {/* Details card (full width) */}
          <div className="mb-6">
            <ErrorBoundary>
              <FunctionBuilder
                func={b.func}
                editing={b.editing}
                name={b.name}
                setName={b.setName}
                description={b.description}
                setDescription={b.setDescription}
                folder={b.folder}
                setFolder={b.setFolder}
              />
            </ErrorBoundary>
          </div>

          {/* Data Flow Canvas + Preview Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ErrorBoundary>
              <DataFlowCanvas
                inputs={b.inputs}
                outputs={b.outputs}
                steps={b.steps}
                toolMap={b.toolMap}
                toolCategories={b.toolCategories}
                inputUsageMap={b.inputUsageMap}
                stepInputMap={b.stepInputMap}
                dataFlowEdges={b.dataFlowEdges}
                schemaIssues={b.schemaIssues}
                editing={b.editing}
                expandedSteps={b.expandedSteps}
                editingStepIdx={b.editingStepIdx}
                catalogOpen={b.catalogOpen}
                availableVariables={b.availableVariables}
                setInputs={b.setInputs}
                setOutputs={b.setOutputs}
                setSteps={b.setSteps}
                setCatalogOpen={b.setCatalogOpen}
                setEditingStepIdx={b.setEditingStepIdx}
                toggleStepExpanded={b.toggleStepExpanded}
              />
            </ErrorBoundary>

            <ErrorBoundary>
              <LivePreviewPanel
                steps={b.steps}
                outputs={b.outputs}
                toolMap={b.toolMap}
                testInputs={b.testInputs}
                schemaIssues={b.schemaIssues}
                costEstimate={b.costEstimate}
                func={b.func}
                inputs={b.inputs}
                editing={b.editing}
                catalogOpen={b.catalogOpen}
                toolCategories={b.toolCategories}
                onAddStep={b.handleAddStep}
                clayWizardOpen={b.clayWizardOpen}
                setClayWizardOpen={b.setClayWizardOpen}
                clayConfig={b.clayConfig}
                clayWizardStep={b.clayWizardStep}
                setClayWizardStep={b.setClayWizardStep}
                onCopyConfig={b.handleCopyClayConfig}
                onOpenWizard={b.openClayWizard}
              />
            </ErrorBoundary>
          </div>

          {/* Quick Test Panel */}
          {b.testOpen && (
            <div className="mt-6">
              <ErrorBoundary>
                <FunctionPlayground
                  inputs={b.func.inputs}
                  testInputs={b.testInputs}
                  setTestInputs={b.setTestInputs}
                  testResult={b.testResult}
                  testing={b.testing}
                  onRun={b.handleRunTest}
                  onClose={() => b.setTestOpen(false)}
                  preview={b.preview}
                  previewing={b.previewing}
                  onPreview={b.handlePreview}
                  streamingTrace={b.streamingTrace}
                  functionId={b.func.id}
                />
              </ErrorBoundary>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
