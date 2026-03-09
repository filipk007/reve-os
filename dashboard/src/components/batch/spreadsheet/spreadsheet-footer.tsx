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
    <div className="flex items-center gap-3 px-4 py-1.5 border-t border-clay-500 bg-clay-800/50 text-xs text-clay-200">
      <span>{total} rows</span>
      <span className="text-clay-300">&middot;</span>
      <span className="text-kiln-teal">{complete} complete</span>
      {failed > 0 && (
        <>
          <span className="text-clay-300">&middot;</span>
          <span className="text-kiln-coral">{failed} failed</span>
        </>
      )}
      {running > 0 && (
        <>
          <span className="text-clay-300">&middot;</span>
          <span className="text-kiln-mustard">{running} running</span>
        </>
      )}
    </div>
  );
}
