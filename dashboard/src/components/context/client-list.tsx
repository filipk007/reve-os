"use client";

import { useState } from "react";
import type { ClientSummary } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, Globe } from "lucide-react";

interface ClientListProps {
  clients: ClientSummary[];
  onAdd: () => void;
  onEdit: (slug: string) => void;
  onDelete: (slug: string, name: string) => void;
}

export function ClientList({ clients, onAdd, onEdit, onDelete }: ClientListProps) {
  const [search, setSearch] = useState("");

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-clay-200" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-clay-800 border-clay-700 text-clay-100 placeholder:text-clay-300"
          />
        </div>
        <Button
          onClick={onAdd}
          className="bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light font-semibold"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-clay-200">
          {clients.length === 0
            ? "No client profiles yet. Create one to get started."
            : "No clients match your search."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <Card
              key={client.slug}
              className="bg-clay-800 border-clay-500 p-4 hover:border-clay-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-clay-100 truncate">
                    {client.name}
                  </h3>
                  <p className="text-xs text-clay-200 font-mono">{client.slug}</p>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(client.slug)}
                    className="text-clay-200 hover:text-clay-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(client.slug, client.name)}
                    className="text-clay-200 hover:text-kiln-coral"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {client.industry && (
                  <Badge
                    variant="secondary"
                    className="bg-clay-800 text-clay-300 border-clay-700 text-xs"
                  >
                    {client.industry}
                  </Badge>
                )}
                {client.stage && (
                  <Badge
                    variant="secondary"
                    className="bg-kiln-teal/10 text-kiln-teal border-kiln-teal/20 text-xs"
                  >
                    {client.stage}
                  </Badge>
                )}
              </div>
              {client.domain && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-clay-200">
                  <Globe className="h-3 w-3" />
                  {client.domain}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
