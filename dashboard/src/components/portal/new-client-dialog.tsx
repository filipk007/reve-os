"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { onboardClient } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function NewClientDialog({ open, onOpenChange }: NewClientDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) {
      setSlug(slugify(val));
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    setCreating(true);
    try {
      const result = await onboardClient({ slug, name });
      toast.success(`Created ${result.name} with ${result.sops_created} SOPs`);
      onOpenChange(false);
      setName("");
      setSlug("");
      setSlugEdited(false);
      router.push(`/clients/${result.slug}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create client");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-clay-800 border-clay-600 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-clay-100">New Client</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-clay-300 mb-1 block">Client Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Corp"
              className="w-full bg-clay-900 border border-clay-600 rounded-md px-3 py-2 text-sm text-clay-100 placeholder:text-clay-500 focus:outline-none focus:border-kiln-teal"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-clay-300 mb-1 block">Slug (URL-safe)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="acme-corp"
              className="w-full bg-clay-900 border border-clay-600 rounded-md px-3 py-2 text-sm text-clay-100 placeholder:text-clay-500 focus:outline-none focus:border-kiln-teal font-mono"
            />
            <p className="text-[10px] text-clay-500 mt-1">Used in URLs and file paths</p>
          </div>

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
              onClick={handleCreate}
              disabled={creating || !name.trim() || !slug.trim()}
              className="bg-kiln-teal text-clay-900 hover:bg-kiln-teal/90 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {creating ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
