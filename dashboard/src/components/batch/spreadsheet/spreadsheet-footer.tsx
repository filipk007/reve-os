"use client";

export function SpreadsheetFooter({
  total,
  complete,
  failed,
  running,
}: {
  total: number;
  complete: number;
  failed: number;
  running: number;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 border-t border-clay-800 bg-clay-900/50 text-xs text-clay-500">
      <span>{total} rows</span>
      <span className="text-clay-700">&middot;</span>
      <span className="text-kiln-teal">{complete} complete</span>
      {failed > 0 && (
        <>
          <span className="text-clay-700">&middot;</span>
          <span className="text-kiln-coral">{failed} failed</span>
        </>
      )}
      {running > 0 && (
        <>
          <span className="text-clay-700">&middot;</span>
          <span className="text-kiln-mustard">{running} running</span>
        </>
      )}
    </div>
  );
}
