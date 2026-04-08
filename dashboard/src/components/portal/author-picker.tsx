"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SAVED_AUTHORS_KEY = "portal-comment-authors";
const SELECTED_AUTHOR_KEY = "portal-comment-selected-author";

export function getSavedAuthors(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_AUTHORS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAuthor(name: string) {
  const authors = getSavedAuthors();
  if (!authors.includes(name)) {
    authors.push(name);
    localStorage.setItem(SAVED_AUTHORS_KEY, JSON.stringify(authors));
  }
  localStorage.setItem(SELECTED_AUTHOR_KEY, name);
}

export function getSelectedAuthor(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SELECTED_AUTHOR_KEY) || "";
}

interface AuthorPickerProps {
  value: string;
  onChange: (name: string) => void;
  size?: "sm" | "md";
  placeholder?: string;
  className?: string;
}

export function AuthorPicker({ value, onChange, size = "sm", placeholder = "Select name", className }: AuthorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [savedAuthors, setSavedAuthors] = useState<string[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedAuthors(getSavedAuthors());
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setAddingNew(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  useEffect(() => {
    if (addingNew && newNameRef.current) newNameRef.current.focus();
  }, [addingNew]);

  const selectAuthor = (name: string) => {
    onChange(name);
    saveAuthor(name);
    setShowPicker(false);
    setAddingNew(false);
  };

  const handleAddNew = () => {
    const name = newName.trim();
    if (!name) return;
    saveAuthor(name);
    setSavedAuthors(getSavedAuthors());
    onChange(name);
    setNewName("");
    setAddingNew(false);
    setShowPicker(false);
  };

  const isMd = size === "md";
  const avatarSize = isMd ? "h-6 w-6 text-[10px]" : "h-4 w-4 text-[9px]";
  const listAvatarSize = isMd ? "h-6 w-6 text-[10px]" : "h-5 w-5 text-[9px]";
  const textSize = isMd ? "text-sm" : "text-xs";

  return (
    <div className={cn("relative", className)} ref={pickerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors border",
          isMd ? "px-3" : "px-2",
          value
            ? "text-clay-200 border-clay-600 hover:border-clay-500 bg-clay-900"
            : "text-clay-300 border-clay-600 hover:text-clay-300 bg-clay-900",
          textSize
        )}
      >
        {value ? (
          <>
            <span className={cn("rounded-full bg-clay-600 flex items-center justify-center font-medium text-clay-300 shrink-0", avatarSize)}>
              {value.charAt(0).toUpperCase()}
            </span>
            {value}
          </>
        ) : (
          placeholder
        )}
        <ChevronDown className="h-3 w-3 text-clay-300 ml-auto" />
      </button>

      {showPicker && (
        <div className="absolute bottom-full left-0 mb-1 w-52 bg-clay-800 border border-clay-600 rounded-lg shadow-xl z-20 py-1">
          {savedAuthors.length === 0 && !addingNew && (
            <div className="px-3 py-2 text-[11px] text-clay-300">No saved names yet</div>
          )}

          {savedAuthors.map((name) => (
            <button
              key={name}
              onClick={() => selectAuthor(name)}
              className={cn(
                "w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-clay-700 transition-colors",
                textSize,
                value === name ? "text-kiln-teal" : "text-clay-200"
              )}
            >
              <span className={cn("rounded-full bg-clay-600 flex items-center justify-center font-medium text-clay-300 shrink-0", listAvatarSize)}>
                {name.charAt(0).toUpperCase()}
              </span>
              {name}
            </button>
          ))}

          {addingNew ? (
            <div className="px-2 py-1.5 flex gap-1 border-t border-clay-700 mt-1">
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
                className="flex-1 bg-clay-900 border border-clay-600 rounded px-2 py-1 text-xs text-clay-100 placeholder:text-clay-300 focus:outline-none focus:border-clay-400"
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
              className={cn(
                "w-full text-left px-3 py-1.5 text-clay-300 hover:text-clay-200 hover:bg-clay-700 flex items-center gap-2 transition-colors border-t border-clay-700 mt-1",
                textSize
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Add person
            </button>
          )}
        </div>
      )}
    </div>
  );
}
