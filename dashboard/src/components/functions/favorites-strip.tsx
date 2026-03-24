"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Play, Star } from "lucide-react";
import type { FunctionDefinition } from "@/lib/types";

interface FavoritesStripProps {
  functions: FunctionDefinition[];
  favoriteIds: string[];
}

export function FavoritesStrip({ functions, favoriteIds }: FavoritesStripProps) {
  const router = useRouter();

  const favFunctions = favoriteIds
    .map((id) => functions.find((f) => f.id === id))
    .filter(Boolean) as FunctionDefinition[];

  if (favFunctions.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Star className="h-3.5 w-3.5 text-amber-400" />
        <h3 className="text-xs font-semibold text-clay-200 uppercase tracking-wider">
          Favorites
        </h3>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {favFunctions.map((func) => (
          <Button
            key={func.id}
            variant="outline"
            size="sm"
            onClick={() => router.push(`/run/${func.id}`)}
            className="shrink-0 h-8 border-clay-600 text-clay-200 hover:bg-clay-700 hover:text-clay-100 text-xs"
          >
            <Play className="h-3 w-3 mr-1.5 text-kiln-teal" />
            {func.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
