"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useFunctionWorkbench } from "@/hooks/use-function-workbench";
import {
  FunctionSelector,
  FunctionInfoPanel,
  ColumnMappingPanel,
  CsvUploadZone,
  CsvPreviewTable,
} from "@/components/workbench-v2";
import { ProgressBar } from "@/components/shared/progress-bar";
import { SpreadsheetView } from "@/components/shared/spreadsheet";

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
  const wb = useFunctionWorkbench();

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
              <div className="flex justify-end">
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
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={wb.resetWorkbench}
                  className="border-clay-600 text-clay-300 text-xs"
                >
                  New Run
                </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
