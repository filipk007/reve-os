export type SpreadsheetStatus = "pending" | "running" | "done" | "error";

export interface SpreadsheetRow {
  _id: string;
  _status: SpreadsheetStatus;
  _error: string | null;
  _original: Record<string, string>;
  _result: Record<string, unknown> | null;
  [key: string]: unknown;
}
