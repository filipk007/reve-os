"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { fetchSOPTemplates, cloneSOPTemplates } from "@/lib/api";
import type { SOPTemplate } from "@/lib/types";
import { toast } from "sonner";

interface TemplatePickerProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloned: () => void;
}

export function TemplatePicker({ slug, open, onOpenChange, onCloned }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<SOPTemplate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchSOPTemplates()
      .then((res) => {
        setTemplates(res.templates);
        setSelected(new Set(res.templates.map((t) => t.id)));
      })
      .catch(() => toast.error("Failed to load templates"))
      .finally(() => setLoading(false));
  }, [open]);

  const toggleTemplate = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClone = async () => {
    if (selected.size === 0) return;
    setCloning(true);
    try {
      const result = await cloneSOPTemplates(slug, Array.from(selected));
      toast.success(`Cloned ${result.cloned} SOP templates`);
      onOpenChange(false);
      onCloned();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clone templates");
    } finally {
      setCloning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-clay-800 border-clay-600 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-clay-100">Clone SOP Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-clay-700 rounded animate-pulse" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-clay-300 py-4 text-center">No templates available.</p>
          ) : (
            templates.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-clay-700 bg-clay-850 p-3 cursor-pointer hover:border-clay-500 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggleTemplate(t.id)}
                  className="accent-kiln-teal"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-clay-100">{t.title}</p>
                  <p className="text-[10px] text-clay-300">{t.category}</p>
                </div>
              </label>
            ))
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-clay-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleClone}
              disabled={cloning || selected.size === 0}
              className="bg-kiln-teal text-clay-900 hover:bg-kiln-teal/90 gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              {cloning ? "Cloning..." : `Clone ${selected.size} Selected`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
