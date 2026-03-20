"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Settings } from "lucide-react";
import type {
  FunctionDefinition,
  FunctionInput,
  FunctionStep,
  FunctionOutput,
  ToolCategory,
  ToolDefinition,
  SchemaIssue,
  CostEstimate,
} from "@/lib/types";
import { LivePreviewContent } from "./live-preview-content";
import { FunctionClayConfig } from "./function-clay-config";

interface LivePreviewPanelProps {
  // Preview data
  steps: FunctionStep[];
  outputs: FunctionOutput[];
  toolMap: Record<string, ToolDefinition>;
  testInputs: Record<string, string>;
  schemaIssues: SchemaIssue[];
  costEstimate: CostEstimate;

  // Clay config passthrough
  func: FunctionDefinition;
  inputs: FunctionInput[];
  editing: boolean;
  catalogOpen: boolean;
  toolCategories: ToolCategory[];
  onAddStep: (tool: string) => void;
  clayWizardOpen: boolean;
  setClayWizardOpen: (v: boolean) => void;
  clayConfig: Record<string, unknown> | null;
  clayWizardStep: number;
  setClayWizardStep: (v: number) => void;
  onCopyConfig: () => void;
  onOpenWizard: () => Promise<void>;
}

export function LivePreviewPanel({
  steps,
  outputs,
  toolMap,
  testInputs,
  schemaIssues,
  costEstimate,
  func,
  inputs,
  editing,
  catalogOpen,
  toolCategories,
  onAddStep,
  clayWizardOpen,
  setClayWizardOpen,
  clayConfig,
  clayWizardStep,
  setClayWizardStep,
  onCopyConfig,
  onOpenWizard,
}: LivePreviewPanelProps) {
  return (
    <div className="space-y-4">
      <Card className="border-clay-600">
        <CardContent className="p-0">
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-clay-700 bg-transparent h-9 px-2">
              <TabsTrigger
                value="preview"
                className="text-xs data-[state=active]:text-kiln-teal data-[state=active]:border-b-2 data-[state=active]:border-kiln-teal rounded-none px-3 h-8"
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </TabsTrigger>
              <TabsTrigger
                value="clay"
                className="text-xs data-[state=active]:text-kiln-teal data-[state=active]:border-b-2 data-[state=active]:border-kiln-teal rounded-none px-3 h-8"
              >
                <Settings className="h-3 w-3 mr-1" />
                Clay Config
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="p-4 mt-0">
              <LivePreviewContent
                steps={steps}
                outputs={outputs}
                toolMap={toolMap}
                testInputs={testInputs}
                schemaIssues={schemaIssues}
                costEstimate={costEstimate}
              />
            </TabsContent>

            <TabsContent value="clay" className="mt-0">
              <div className="p-0">
                <FunctionClayConfig
                  func={func}
                  inputs={inputs}
                  editing={editing}
                  catalogOpen={catalogOpen}
                  toolCategories={toolCategories}
                  onAddStep={onAddStep}
                  clayWizardOpen={clayWizardOpen}
                  setClayWizardOpen={setClayWizardOpen}
                  clayConfig={clayConfig}
                  clayWizardStep={clayWizardStep}
                  setClayWizardStep={setClayWizardStep}
                  onCopyConfig={onCopyConfig}
                  onOpenWizard={onOpenWizard}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
