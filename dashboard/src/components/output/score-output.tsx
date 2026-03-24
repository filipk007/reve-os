"use client";

import { cn } from "@/lib/utils";

interface ScoreOutputProps {
  result: Record<string, unknown>;
}

export function ScoreOutput({ result }: ScoreOutputProps) {
  const scoreEntries: { key: string; value: number; label: string }[] = [];
  const otherEntries: { key: string; value: unknown }[] = [];

  for (const [key, value] of Object.entries(result)) {
    if (key.startsWith("_")) continue;

    if (
      typeof value === "number" &&
      (/_score$/i.test(key) || /_confidence$/i.test(key))
    ) {
      scoreEntries.push({
        key,
        value,
        label: key
          .replace(/_score$/i, "")
          .replace(/_confidence$/i, "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      });
    } else {
      otherEntries.push({ key, value });
    }
  }

  // Sort scores descending
  scoreEntries.sort((a, b) => b.value - a.value);

  // Find overall score if present
  const overallIdx = scoreEntries.findIndex(
    (s) =>
      s.key.toLowerCase().includes("overall") ||
      s.key.toLowerCase().includes("total")
  );
  const overall = overallIdx >= 0 ? scoreEntries.splice(overallIdx, 1)[0] : null;

  return (
    <div className="space-y-4">
      {/* Overall score ring */}
      {overall && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-clay-900/50 border border-clay-700">
          <ScoreRing value={overall.value} size={56} />
          <div>
            <div className="text-sm font-semibold text-clay-100">
              {overall.label}
            </div>
            <div className="text-xs text-clay-300">
              {scoreLabel(overall.value)}
            </div>
          </div>
        </div>
      )}

      {/* Score bars */}
      {scoreEntries.length > 0 && (
        <div className="space-y-2.5">
          {scoreEntries.map((entry) => (
            <ScoreBar key={entry.key} label={entry.label} value={entry.value} />
          ))}
        </div>
      )}

      {/* Other fields */}
      {otherEntries.length > 0 && (
        <div className="border-t border-clay-700 pt-3 space-y-2">
          {otherEntries.map(({ key, value }) => (
            <div key={key} className="flex items-start gap-2 text-xs">
              <span className="font-mono text-clay-300 shrink-0">{key}:</span>
              <span className="text-clay-200 break-words">
                {typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  // Normalize: if value > 1, assume 0-100 scale; otherwise 0-1
  const normalized = value > 1 ? value / 100 : value;
  const pct = Math.round(normalized * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-clay-200">{label}</span>
        <span className="text-xs font-mono text-clay-300">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-clay-800 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 70
              ? "bg-emerald-500"
              : pct >= 40
                ? "bg-amber-500"
                : "bg-red-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreRing({
  value,
  size = 56,
}: {
  value: number;
  size?: number;
}) {
  const normalized = value > 1 ? value / 100 : value;
  const pct = Math.round(normalized * 100);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - normalized);

  const color =
    pct >= 70
      ? "text-emerald-500"
      : pct >= 40
        ? "text-amber-500"
        : "text-red-500";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          className="text-clay-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-sm font-bold", color)}>{pct}</span>
      </div>
    </div>
  );
}

function scoreLabel(value: number): string {
  const pct = value > 1 ? value : value * 100;
  if (pct >= 80) return "Excellent";
  if (pct >= 60) return "Good";
  if (pct >= 40) return "Fair";
  return "Low";
}
