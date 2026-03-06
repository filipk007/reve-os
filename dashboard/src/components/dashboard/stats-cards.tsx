"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { fetchStats, createJobStream } from "@/lib/api";
import type { Stats } from "@/lib/types";
import { formatDuration } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const CARDS: { key: string; label: string; asset: string; format?: string }[] = [
  { key: "total_processed", label: "Processed", asset: "/brand-assets/v2-chart.png" },
  { key: "active_workers", label: "Active Workers", asset: "/brand-assets/v2-rocket.png" },
  { key: "queue_depth", label: "Queue Depth", asset: "/brand-assets/v2-funnel.png" },
  { key: "avg_duration_ms", label: "Avg Duration", asset: "/brand-assets/v2-hourglass.png", format: "duration" },
  { key: "success_rate", label: "Success Rate", asset: "/brand-assets/v2-target.png", format: "percent" },
  { key: "cache_hit_rate", label: "Cache Hit Rate", asset: "/brand-assets/v2-compass.png", format: "percent" },
];

function formatValue(key: string, value: number, format?: string) {
  if (format === "duration") return formatDuration(value);
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  return value;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let active = true;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const refresh = () =>
      fetchStats()
        .then((s) => active && setStats(s))
        .catch(() => {});

    refresh();

    // Try SSE for real-time updates, fall back to polling
    try {
      const es = createJobStream(() => {
        refresh();
      });
      esRef.current = es;

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (!pollId && active) {
          pollId = setInterval(refresh, 5000);
        }
      };
    } catch {
      pollId = setInterval(refresh, 5000);
    }

    return () => {
      active = false;
      if (esRef.current) esRef.current.close();
      if (pollId) clearInterval(pollId);
    };
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-clay-800 bg-clay-900">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2 bg-clay-800" />
              <Skeleton className="h-8 w-16 bg-clay-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
      {CARDS.map((c) => {
        const value = stats[c.key as keyof Stats] as number;
        const isFail =
          (c.key === "success_rate" && value < 0.9) ||
          (c.key === "cache_hit_rate" && value < 0.1);
        return (
          <Card
            key={c.key}
            className="border-clay-800 bg-clay-900 hover:border-kiln-teal/30 transition-all duration-200 group"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-clay-500 uppercase tracking-wide font-[family-name:var(--font-sans)]">
                  {c.label}
                </p>
                <Image
                  src={c.asset}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-sm opacity-60 group-hover:opacity-90 transition-opacity"
                />
              </div>
              <p
                className={`text-2xl font-semibold font-[family-name:var(--font-mono)] ${
                  isFail ? "text-kiln-coral" : "text-kiln-teal"
                }`}
              >
                {formatValue(c.key, value, c.format)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
