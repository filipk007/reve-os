"use client";

import type { FunctionDefinition } from "@/lib/types";
import type { CsvData } from "@/hooks/use-function-workbench";
import { cn } from "@/lib/utils";
import { Upload, FileSpreadsheet } from "lucide-react";

interface CsvUploadZoneProps {
  csvData: CsvData | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (file: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onClear: () => void;
  selectedFunction?: FunctionDefinition | null;
}

export function CsvUploadZone({
  csvData,
  fileInputRef,
  onFileUpload,
  onDrop,
  onClear,
  selectedFunction,
}: CsvUploadZoneProps) {
  const requiredFields = selectedFunction?.inputs
    .filter((i) => i.required)
    .map((i) => i.name);

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
        csvData
          ? "border-kiln-teal/30 bg-kiln-teal/5"
          : "border-clay-600 hover:border-clay-500 hover:bg-clay-800/50"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileUpload(file);
        }}
      />
      {csvData ? (
        <div className="space-y-1.5">
          <FileSpreadsheet className="h-8 w-8 text-kiln-teal mx-auto" />
          <div className="text-sm font-medium text-clay-100">
            {csvData.fileName}
          </div>
          <div className="text-xs text-clay-300">
            {csvData.totalRows} rows, {csvData.headers.length} columns
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-xs text-clay-400 hover:text-clay-200 underline"
          >
            Upload different file
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Upload className="h-8 w-8 text-clay-400 mx-auto" />
          <div className="text-sm text-clay-200">
            Drag and drop a CSV file here
          </div>
          <div className="text-xs text-clay-400">or click to browse</div>
          {requiredFields && requiredFields.length > 0 && (
            <div className="text-[11px] text-clay-500 pt-1">
              Expected columns:{" "}
              {requiredFields.map((f, i) => (
                <span key={f}>
                  <code className="text-clay-400 bg-clay-800 rounded px-1 py-px">
                    {f}
                  </code>
                  {i < requiredFields.length - 1 && ", "}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
