"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Trash2, Loader2, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchComments, postComment, deleteComment } from "@/lib/api";
import { MarkdownContent } from "./markdown-content";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PortalComment } from "@/lib/types";

const SAVED_AUTHORS_KEY = "portal-comment-authors";
const SELECTED_AUTHOR_KEY = "portal-comment-selected-author";

function getSavedAuthors(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_AUTHORS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAuthor(name: string) {
  const authors = getSavedAuthors();
  if (!authors.includes(name)) {
    authors.push(name);
    localStorage.setItem(SAVED_AUTHORS_KEY, JSON.stringify(authors));
  }
  localStorage.setItem(SELECTED_AUTHOR_KEY, name);
}

function getSelectedAuthor(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SELECTED_AUTHOR_KEY) || "";
}

interface CommentThreadProps {
  slug: string;
  updateId: string;
  initialCount?: number;
}

export function CommentThread({ slug, updateId, initialCount = 0 }: CommentThreadProps) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [posting, setPosting] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [showAuthorPicker, setShowAuthorPicker] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [savedAuthors, setSavedAuthors] = useState<string[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);

  // Load saved authors and last selection on mount
  useEffect(() => {
    setSavedAuthors(getSavedAuthors());
    const last = getSelectedAuthor();
    if (last) setAuthor(last);
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!showAuthorPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAuthorPicker(false);
        setAddingNew(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAuthorPicker]);

  // Focus new name input when adding
  useEffect(() => {
    if (addingNew && newNameRef.current) newNameRef.current.focus();
  }, [addingNew]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchComments(slug, updateId)
      .then((res) => {
        setComments(res.comments);
        setCount(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, updateId, open]);

  const selectAuthor = (name: string) => {
    setAuthor(name);
    saveAuthor(name);
    setShowAuthorPicker(false);
    setAddingNew(false);
  };

  const handleAddNew = () => {
    const name = newName.trim();
    if (!name) return;
    saveAuthor(name);
    setSavedAuthors(getSavedAuthors());
    setAuthor(name);
    setNewName("");
    setAddingNew(false);
    setShowAuthorPicker(false);
  };

  const handlePost = async () => {
    if (!body.trim() || !author.trim()) {
      toast.error("Select a name and write a comment");
      return;
    }
    setPosting(true);
    try {
      const comment = await postComment(slug, updateId, { body, author });
      setComments((prev) => [...prev, comment]);
      setCount((c) => c + 1);
      setBody("");
      // Ensure author is saved
      saveAuthor(author);
      if (!savedAuthors.includes(author)) setSavedAuthors(getSavedAuthors());
      toast.success("Comment posted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(slug, updateId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCount((c) => c - 1);
      toast.success("Comment deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete comment");
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-clay-400 hover:text-clay-200 transition-colors"
      >
        <MessageCircle className="h-3 w-3" />
        {count > 0 ? `${count} comment${count !== 1 ? "s" : ""}` : "Comment"}
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-clay-700 pt-3">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-clay-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading comments...
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <div key={comment.id} className="group flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-clay-700 flex items-center justify-center shrink-0 text-[10px] font-medium text-clay-300">
                    {comment.author.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-clay-200">{comment.author}</span>
                      <span className="text-[10px] text-clay-500">
                        {new Date(comment.created_at * 1000).toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="opacity-0 group-hover:opacity-100 text-clay-500 hover:text-red-400 transition-all ml-auto"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <MarkdownContent content={comment.body} className="mt-0.5" />
                  </div>
                </div>
              ))}

              {/* Author picker + comment input */}
              <div className="space-y-2">
                {/* Author selector */}
                <div className="relative" ref={pickerRef}>
                  <button
                    onClick={() => setShowAuthorPicker(!showAuthorPicker)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs rounded-md px-2 py-1 transition-colors",
                      author
                        ? "text-clay-200 hover:bg-clay-700"
                        : "text-clay-500 hover:text-clay-300 hover:bg-clay-700"
                    )}
                  >
                    {author ? (
                      <>
                        <span className="h-4 w-4 rounded-full bg-clay-600 flex items-center justify-center text-[9px] font-medium text-clay-300 shrink-0">
                          {author.charAt(0).toUpperCase()}
                        </span>
                        {author}
                      </>
                    ) : (
                      "Select name"
                    )}
                    <ChevronDown className="h-3 w-3 text-clay-500" />
                  </button>

                  {showAuthorPicker && (
                    <div className="absolute bottom-full left-0 mb-1 w-48 bg-clay-800 border border-clay-600 rounded-lg shadow-xl z-20 py-1">
                      {savedAuthors.map((name) => (
                        <button
                          key={name}
                          onClick={() => selectAuthor(name)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-clay-700 transition-colors",
                            author === name ? "text-kiln-teal" : "text-clay-200"
                          )}
                        >
                          <span className="h-5 w-5 rounded-full bg-clay-600 flex items-center justify-center text-[9px] font-medium text-clay-300 shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </span>
                          {name}
                        </button>
                      ))}

                      {/* Add new person */}
                      {addingNew ? (
                        <div className="px-2 py-1.5 flex gap-1">
                          <input
                            ref={newNameRef}
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddNew();
                              if (e.key === "Escape") { setAddingNew(false); setNewName(""); }
                            }}
                            placeholder="Name"
                            className="flex-1 bg-clay-900 border border-clay-600 rounded px-2 py-1 text-xs text-clay-100 placeholder:text-clay-500 focus:outline-none focus:border-clay-400"
                          />
                          <Button
                            size="sm"
                            onClick={handleAddNew}
                            disabled={!newName.trim()}
                            className="h-6 px-2 text-[10px] bg-clay-600 hover:bg-clay-500"
                          >
                            Add
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingNew(true)}
                          className="w-full text-left px-3 py-1.5 text-xs text-clay-400 hover:text-clay-200 hover:bg-clay-700 flex items-center gap-2 transition-colors border-t border-clay-700 mt-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add person
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Comment input row */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={author ? `Comment as ${author}...` : "Select a name first..."}
                    className="flex-1 bg-clay-900 border border-clay-600 rounded-md px-2.5 py-1.5 text-xs text-clay-100 placeholder:text-clay-500 focus:outline-none focus:border-clay-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handlePost();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handlePost}
                    disabled={posting || !body.trim() || !author.trim()}
                    className="h-7 w-7 p-0 bg-clay-600 hover:bg-clay-500"
                  >
                    {posting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
