"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  accentColor?: string;
  onClick: () => void;
}

export function QuickActionCard({
  icon: Icon,
  title,
  subtitle,
  accentColor = "kiln-teal",
  onClick,
}: QuickActionCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "border-clay-600 hover:border-clay-500 cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 group"
      )}
    >
      <CardContent className="p-5 flex items-start gap-4">
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors",
            accentColor === "kiln-teal" && "bg-kiln-teal/10 text-kiln-teal group-hover:bg-kiln-teal/15",
            accentColor === "purple" && "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/15",
            accentColor === "amber" && "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/15"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-clay-100 mb-0.5">{title}</h3>
          <p className="text-xs text-clay-300 leading-relaxed">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}
