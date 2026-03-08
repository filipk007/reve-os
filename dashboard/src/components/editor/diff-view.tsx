"use client";

import { useMemo, useRef, useCallback } from "react";

interface DiffLine {
  type: "same" | "added" | "removed";
  content: string;
  lineNumber: number;
}

/**
 * LCS-based line diff algorithm
 */
function computeDiff(leftText: string, rightText: string): { left: DiffLine[]; right: DiffLine[] } {
  const leftLines = leftText.split("\n");
  const rightLines = rightText.split("\n");

  // Build LCS table
  const m = leftLines.length;
  const n = rightLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const left: DiffLine[] = [];
  const right: DiffLine[] = [];
  let i = m;
  let j = n;

  const tempLeft: DiffLine[] = [];
  const tempRight: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      tempLeft.push({ type: "same", content: leftLines[i - 1], lineNumber: i });
      tempRight.push({ type: "same", content: rightLines[j - 1], lineNumber: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tempLeft.push({ type: "same", content: "", lineNumber: 0 }); // placeholder
      tempRight.push({ type: "added", content: rightLines[j - 1], lineNumber: j });
      j--;
    } else if (i > 0) {
      tempLeft.push({ type: "removed", content: leftLines[i - 1], lineNumber: i });
      tempRight.push({ type: "same", content: "", lineNumber: 0 }); // placeholder
      i--;
    }
  }

  return { left: tempLeft.reverse(), right: tempRight.reverse() };
}

function DiffSide({
  lines,
  title,
  scrollRef,
  onScroll,
}: {
  lines: DiffLine[];
  title: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3 py-1.5 border-b border-clay-800 bg-clay-900">
        <span className="text-[10px] text-clay-500 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-auto font-[family-name:var(--font-mono)] text-xs"
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={`flex ${
              line.type === "removed"
                ? "bg-red-950/30 border-l-2 border-red-500"
                : line.type === "added"
                  ? "bg-green-950/30 border-l-2 border-green-500"
                  : "border-l-2 border-transparent"
            }`}
          >
            <span className="w-10 shrink-0 text-right pr-2 py-0.5 text-clay-600 select-none bg-clay-900/30">
              {line.lineNumber > 0 ? line.lineNumber : ""}
            </span>
            <span className="py-0.5 px-2 whitespace-pre-wrap text-clay-300">
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiffView({
  leftContent,
  rightContent,
  leftTitle,
  rightTitle,
}: {
  leftContent: string;
  rightContent: string;
  leftTitle: string;
  rightTitle: string;
}) {
  const { left, right } = useMemo(
    () => computeDiff(leftContent, rightContent),
    [leftContent, rightContent]
  );

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const syncScroll = useCallback((source: "left" | "right") => {
    const from = source === "left" ? leftRef.current : rightRef.current;
    const to = source === "left" ? rightRef.current : leftRef.current;
    if (from && to) {
      to.scrollTop = from.scrollTop;
    }
  }, []);

  return (
    <div className="flex h-full rounded-lg border border-clay-800 overflow-hidden bg-clay-950">
      <DiffSide
        lines={left}
        title={leftTitle}
        scrollRef={leftRef}
        onScroll={() => syncScroll("left")}
      />
      <div className="w-px bg-clay-800" />
      <DiffSide
        lines={right}
        title={rightTitle}
        scrollRef={rightRef}
        onScroll={() => syncScroll("right")}
      />
    </div>
  );
}
