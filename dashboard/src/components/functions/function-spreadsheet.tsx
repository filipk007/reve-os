"use client";

import { useState, useCallback } from "react";
import { TableToolbar } from "@/components/table-builder/table-toolbar";
import { TableGrid } from "@/components/table-builder/table-grid";
import { ColumnCommandPalette } from "@/components/table-builder/column-command-palette";
import { ColumnConfigPanel } from "@/components/table-builder/column-config-panel";
import { CellDetailPanel } from "@/components/table-builder/cell-detail-panel";
import { FunctionSettingsPanel } from "./function-settings-panel";
import type { UseFunctionTableReturn } from "@/hooks/use-function-table";
import type { ToolDefinition, TableColumn } from "@/lib/types";

interface FunctionSpreadsheetProps {
  ft: UseFunctionTableReturn;
}

export function FunctionSpreadsheet({ ft }: FunctionSpreadsheetProps) {
  // Column palette state
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Column config panel state
  const [configOpen, setConfigOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<TableColumn | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [initialType, setInitialType] = useState<string | null>(null);

  // Open command palette from "+" button
  const handleAddColumnClick = useCallback(() => {
    setPaletteOpen(true);
  }, []);

  // Handle palette selections
  const handleSelectEnrichment = useCallback((tool: ToolDefinition) => {
    setSelectedTool(tool);
    setInitialType("enrichment");
    setEditingColumn(null);
    setConfigOpen(true);
  }, []);

  const handleSelectAI = useCallback(() => {
    setSelectedTool(null);
    setInitialType("ai");
    setEditingColumn(null);
    setConfigOpen(true);
  }, []);

  const handleSelectFormula = useCallback(() => {
    setSelectedTool(null);
    setInitialType("formula");
    setEditingColumn(null);
    setConfigOpen(true);
  }, []);

  const handleSelectGate = useCallback(() => {
    setSelectedTool(null);
    setInitialType("gate");
    setEditingColumn(null);
    setConfigOpen(true);
  }, []);

  const handleSelectStatic = useCallback(async () => {
    await ft.addColumn({ name: "New Column", column_type: "static" });
  }, [ft]);

  // Save column config
  const handleSaveColumn = useCallback(
    async (config: Record<string, unknown>) => {
      if (editingColumn) {
        await ft.editColumn(editingColumn.id, config);
      } else {
        await ft.addColumn(config);
      }
    },
    [ft, editingColumn],
  );

  // "Add as column" from cell detail panel
  const handleAddAsColumn = useCallback(
    async (path: string, _value: unknown) => {
      if (!ft.selectedCell) return;
      await ft.addColumn({
        name: path.split(".").pop() || path,
        column_type: "formula",
        parent_column_id: ft.selectedCell.columnId,
        extract_path: path,
        formula: `{{${ft.selectedCell.columnId}}}`,
      });
    },
    [ft],
  );

  const availableColumns = ft.table?.columns.filter((c) => !c.hidden) || [];

  const selectedRow = ft.selectedCell
    ? ft.rows.find((r) => r._row_id === ft.selectedCell!.rowId) || null
    : null;

  if (!ft.table) return null;

  return (
    <>
      <TableToolbar
        table={ft.table}
        totalRows={ft.totalRows}
        executing={ft.executing}
        onRename={ft.rename}
        onImportCsv={ft.importCsv}
        onAddRow={() => ft.addRow({})}
        onRefresh={ft.refresh}
        selectedCount={Object.keys(ft.rowSelection).length}
        onDeleteSelected={() => {
          const ids = Object.keys(ft.rowSelection);
          if (ids.length > 0) ft.removeRows(ids);
        }}
        onExecute={(options) => ft.executeTable(options)}
        onStop={ft.stopExecution}
        onSettings={() => ft.setSettingsOpen(true)}
      />

      <div className="flex-1 overflow-hidden">
        <TableGrid
          table={ft.table}
          rows={ft.rows}
          columns={ft.tanstackColumns}
          sorting={ft.sorting}
          onSortingChange={ft.setSorting}
          rowSelection={ft.rowSelection}
          onRowSelectionChange={ft.setRowSelection}
          columnSizing={ft.columnSizing}
          onColumnSizingChange={ft.setColumnSizing}
          globalFilter={ft.globalFilter}
          columnProgress={ft.columnProgress}
          cellStates={ft.cellStates}
          selectedCell={ft.selectedCell}
          onCellClick={ft.setSelectedCell}
          onAddColumn={handleAddColumnClick}
          onDeleteColumn={ft.deleteColumn}
        />
      </div>

      {/* Column command palette */}
      <ColumnCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectEnrichment={handleSelectEnrichment}
        onSelectAI={handleSelectAI}
        onSelectFormula={handleSelectFormula}
        onSelectGate={handleSelectGate}
        onSelectStatic={handleSelectStatic}
      />

      {/* Column config panel */}
      <ColumnConfigPanel
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSave={handleSaveColumn}
        editingColumn={editingColumn}
        selectedTool={selectedTool}
        initialType={initialType}
        availableColumns={availableColumns}
      />

      {/* Cell detail panel */}
      <CellDetailPanel
        open={ft.selectedCell !== null}
        onClose={() => ft.setSelectedCell(null)}
        table={ft.table}
        row={selectedRow}
        columnId={ft.selectedCell?.columnId || null}
        onAddAsColumn={handleAddAsColumn}
      />

      {/* Function settings panel */}
      {ft.func && (
        <FunctionSettingsPanel
          open={ft.settingsOpen}
          onClose={() => ft.setSettingsOpen(false)}
          func={ft.func}
          onSave={ft.updateFunctionMeta}
          onDelete={ft.deleteFn}
          onDuplicate={ft.duplicateFn}
        />
      )}
    </>
  );
}
