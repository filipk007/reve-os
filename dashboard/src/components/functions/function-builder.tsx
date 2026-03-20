"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
import type { FunctionDefinition } from "@/lib/types";

interface FunctionBuilderProps {
  func: FunctionDefinition;
  editing: boolean;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  folder: string;
  setFolder: (v: string) => void;
}

export function FunctionBuilder({
  func,
  editing,
  name,
  setName,
  description,
  setDescription,
  folder,
  setFolder,
}: FunctionBuilderProps) {
  return (
    <Card className="border-clay-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-clay-200 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <div>
              <label className="text-xs text-clay-300 mb-1 block">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-clay-900 border-clay-600 text-clay-100"
              />
            </div>
            <div>
              <label className="text-xs text-clay-300 mb-1 block">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs text-clay-300 mb-1 block">
                Folder
              </label>
              <Input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="bg-clay-900 border-clay-600 text-clay-100"
              />
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-clay-200">
              {func.description || "No description"}
            </div>
            <div className="text-xs text-clay-300">
              Folder: {func.folder} | ID: {func.id}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
