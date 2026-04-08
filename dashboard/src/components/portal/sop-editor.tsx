"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { createSOP, updateSOP } from "@/lib/api";
import type { PortalSOP } from "@/lib/types";
import { toast } from "sonner";

const CATEGORIES = ["general", "onboarding", "reporting", "communication", "approval"];

interface SOPEditorProps {
  slug: string;
  sop?: PortalSOP;
  onSaved: () => void;
  onCancel: () => void;
}

export function SOPEditor({ slug, sop, onSaved, onCancel }: SOPEditorProps) {
  const [title, setTitle] = useState(sop?.title || "");
  const [category, setCategory] = useState(sop?.category || "general");
  const [content, setContent] = useState(sop?.content || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (sop) {
        await updateSOP(slug, sop.id, { title, category, content });
        toast.success("SOP updated");
      } else {
        await createSOP(slug, { title, category, content });
        toast.success("SOP created");
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save SOP");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-kiln-teal/30 bg-clay-800 p-4 space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="SOP title..."
          className="flex-1 bg-clay-900 border border-clay-600 rounded-md px-3 py-1.5 text-sm text-clay-100 placeholder:text-clay-300 focus:outline-none focus:border-kiln-teal"
          autoFocus
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-clay-900 border border-clay-600 rounded-md px-3 py-1.5 text-sm text-clay-100 focus:outline-none focus:border-kiln-teal"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your SOP content in markdown..."
        rows={10}
        className="w-full bg-clay-900 border border-clay-600 rounded-md px-3 py-2 text-sm text-clay-100 placeholder:text-clay-300 focus:outline-none focus:border-kiln-teal font-mono resize-y"
      />

      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-clay-300 hover:text-clay-100 gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="bg-kiln-teal text-clay-900 hover:bg-kiln-teal/90 gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : sop ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}
