"use client";

import { useState, useEffect } from "react";
import type { KnowledgeBaseFile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface KnowledgeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: KnowledgeBaseFile | null;
  saving: boolean;
  onSave: (category: string, filename: string, content: string) => void;
}

export function KnowledgeEditor({
  open,
  onOpenChange,
  file,
  saving,
  onSave,
}: KnowledgeEditorProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    if (file) {
      setContent(file.content);
    }
  }, [file]);

  if (!file) return null;

  const filename = file.path.split("/").pop() || file.path;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-clay-950 border-clay-800 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="text-clay-100">{file.name}</SheetTitle>
          <SheetDescription className="text-clay-500 flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-clay-800 text-clay-300 border-clay-700 text-xs"
            >
              {file.category}
            </Badge>
            <span className="font-mono text-xs">{file.path}</span>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-6 pb-2 min-h-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full min-h-[300px] rounded-md bg-clay-900 border border-clay-700 text-clay-100 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-kiln-teal/50 resize-none"
          />
        </div>
        <div className="px-6 pb-6">
          <Button
            onClick={() => onSave(file.category, filename, content)}
            disabled={saving}
            className="w-full bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light font-semibold"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
