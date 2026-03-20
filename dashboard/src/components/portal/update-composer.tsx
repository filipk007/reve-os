"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { createPortalUpdate } from "@/lib/api";
import { toast } from "sonner";

const UPDATE_TYPES = [
  { id: "update", label: "Update" },
  { id: "milestone", label: "Milestone" },
  { id: "deliverable", label: "Deliverable" },
  { id: "note", label: "Note" },
];

interface UpdateComposerProps {
  slug: string;
  onPosted: () => void;
}

export function UpdateComposer({ slug, onPosted }: UpdateComposerProps) {
  const [type, setType] = useState("update");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [createAction, setCreateAction] = useState(true);
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setPosting(true);
    try {
      await createPortalUpdate(slug, {
        type,
        title,
        body,
        create_action: type === "deliverable" && createAction,
      });
      toast.success("Update posted");
      setTitle("");
      setBody("");
      setType("update");
      onPosted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post update");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="rounded-lg border border-clay-600 bg-clay-800 p-4 space-y-3">
      <div className="flex gap-2">
        {UPDATE_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              type === t.id
                ? "bg-kiln-teal/15 text-kiln-teal border border-kiln-teal/30"
                : "bg-clay-700 text-clay-300 border border-clay-600 hover:border-clay-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What happened?"
        className="w-full bg-clay-900 border border-clay-600 rounded-md px-3 py-1.5 text-sm text-clay-100 placeholder:text-clay-500 focus:outline-none focus:border-kiln-teal"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add details (optional)..."
        rows={3}
        className="w-full bg-clay-900 border border-clay-600 rounded-md px-3 py-2 text-sm text-clay-100 placeholder:text-clay-500 focus:outline-none focus:border-kiln-teal resize-y"
      />

      {type === "deliverable" && (
        <label className="flex items-center gap-2 text-xs text-clay-300 cursor-pointer">
          <input
            type="checkbox"
            checked={createAction}
            onChange={(e) => setCreateAction(e.target.checked)}
            className="accent-kiln-teal"
          />
          Auto-create client review action
        </label>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handlePost}
          disabled={posting || !title.trim()}
          className="bg-kiln-teal text-clay-900 hover:bg-kiln-teal/90 gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          {posting ? "Posting..." : "Post Update"}
        </Button>
      </div>
    </div>
  );
}
