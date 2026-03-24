"use client";

import { Folder } from "lucide-react";
import { CatalogCard } from "./catalog-card";
import type { FunctionDefinition, FolderDefinition } from "@/lib/types";

interface CatalogGridProps {
  folders: FolderDefinition[];
  functionsByFolder: Record<string, FunctionDefinition[]>;
  searchQuery: string;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export function CatalogGrid({
  folders,
  functionsByFolder,
  searchQuery,
  favorites,
  onToggleFavorite,
}: CatalogGridProps) {
  const favSet = new Set(favorites);

  // Filter folders that have functions (or show all when not searching)
  const visibleFolders = folders.filter(
    (f) => (functionsByFolder[f.name]?.length ?? 0) > 0 || !searchQuery
  );

  if (visibleFolders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-clay-300">
        <p className="text-sm">No functions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {visibleFolders.map((folder) => {
        const funcs = functionsByFolder[folder.name] || [];
        if (funcs.length === 0 && searchQuery) return null;

        return (
          <section key={folder.name}>
            <div className="flex items-center gap-2 mb-3">
              <Folder className="h-4 w-4 text-clay-300" />
              <h3 className="text-sm font-semibold text-clay-100">
                {folder.name}
              </h3>
              <span className="text-xs text-clay-300">{funcs.length}</span>
            </div>

            {funcs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {funcs.map((func) => (
                  <CatalogCard
                    key={func.id}
                    func={func}
                    isFavorite={favSet.has(func.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-clay-300 pl-6">
                No functions in this folder
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
