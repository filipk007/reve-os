"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Play, ClipboardCheck, Monitor, Cloud } from "lucide-react";
import { useFunctionWorkbench } from "@/hooks/use-function-workbench";
import { isLocalExecutionMode, setExecutionMode } from "@/lib/api";
import { toast } from "sonner";
import { sendToReview } from "@/hooks/use-review-queue";
import {
  FunctionSelector,
  FunctionInfoPanel,
  ColumnMappingPanel,
  CsvUploadZone,
  CsvPreviewTable,
} from "@/components/workbench-v2";
import { ProgressBar } from "@/components/shared/progress-bar";
import { SpreadsheetView } from "@/components/shared/spreadsheet";

function ExecutionModeToggle() {
  const [isLocal, setIsLocal] = useState(isLocalExecutionMode());

  const toggle = () => {
    const next = isLocal ? "remote" : "local";
    setExecutionMode(next);
    setIsLocal(next === "local");
    toast.success(
      next === "local"
        ? "Local mode — batched execution, fewer calls"
        : "Remote mode — individual execution via VPS"
    );
  };

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
        isLocal
          ? "bg-violet-500/10 text-violet-400 border-violet-500/25 hover:bg-violet-500/20"
          : "bg-sky-500/10 text-sky-400 border-sky-500/25 hover:bg-sky-500/20"
      }`}
    >
      {isLocal ? <Monitor className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
      {isLocal ? "Local" : "Remote"}
    </button>
  );
}

export default function WorkbenchPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Workbench" />
          <div className="flex-1 flex items-center justify-center text-clay-300">
            Loading...
          </div>
        </div>
      }
    >
      <WorkbenchPage />
    </Suspense>
  );
}

function WorkbenchPage() {
  const router = useRouter();
  const wb = useFunctionWorkbench();

  const handleSendToReview = () => {
    if (!wb.selectedFunction) return;
    sendToReview(
      wb.selectedFunction.id,
      wb.selectedFunction.name,
      wb.results.map((r) => ({
        rowIndex: r.rowIndex,
        input: r.input,
        output: r.output,
      }))
    );
    router.push("/review");
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Workbench" />
      <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
        {/* Upload / Map phase */}
        {wb.step === "upload" && (
          <div className="space-y-6">
            <FunctionSelector
              functions={wb.functions}
              functionsByFolder={wb.functionsByFolder}
              selectedFunction={wb.selectedFunction}
              onSelect={wb.handleSelectFunction}
            />

            {wb.selectedFunction && (
              <FunctionInfoPanel func={wb.selectedFunction} />
            )}

            <CsvUploadZone
              csvData={wb.csvData}
              fileInputRef={wb.fileInputRef}
              onFileUpload={wb.handleFileUpload}
              onDrop={wb.handleDrop}
              onClear={wb.resetWorkbench}
              selectedFunction={wb.selectedFunction}
            />

            {wb.csvData && (
              <CsvPreviewTable
                csvData={wb.csvData}
                detectColumnType={wb.detectColumnType}
              />
            )}

            {wb.csvData && wb.selectedFunction && (
              <ColumnMappingPanel
                func={wb.selectedFunction}
                csvHeaders={wb.csvData.headers}
                mappings={wb.mappings}
                autoMapConfidence={wb.autoMapConfidence}
                onMapColumn={wb.handleMapColumn}
                onClearMapping={wb.handleClearMapping}
              />
            )}

            {wb.canRun && (
              <div className="flex items-center justify-end gap-3">
                <ExecutionModeToggle />
                <Button
                  onClick={wb.handleRun}
                  className="bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light font-semibold"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run ({wb.csvData!.totalRows} rows)
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Running phase — progress bar + live spreadsheet */}
        {wb.step === "run" && wb.running && (
          <div className="space-y-4">
            <ProgressBar
              total={wb.progress.total}
              completed={wb.doneCount}
              failed={wb.errorCount}
            />
            {wb.spreadsheetRows.length > 0 && wb.csvData && (
              <SpreadsheetView
                rows={wb.spreadsheetRows}
                inputHeaders={wb.csvData.headers}
              />
            )}
          </div>
        )}

        {/* Results phase — spreadsheet with toolbar */}
        {(wb.step === "results" || (wb.step === "run" && !wb.running)) &&
          wb.spreadsheetRows.length > 0 &&
          wb.csvData && (
            <div className="space-y-4">
              <ProgressBar
                total={wb.progress.total}
                completed={wb.doneCount}
                failed={wb.errorCount}
                done
              />
              <SpreadsheetView
                rows={wb.spreadsheetRows}
                inputHeaders={wb.csvData.headers}
                onRetrySelected={wb.handleRetrySelected}
                onNewRun={wb.resetWorkbench}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={wb.resetWorkbench}
                  className="border-clay-600 text-clay-300 text-xs"
                >
                  New Run
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendToReview}
                  disabled={wb.doneCount === 0}
                  className="bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light text-xs font-semibold"
                >
                  <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                  Send to Review ({wb.doneCount})
                </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
