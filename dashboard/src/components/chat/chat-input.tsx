"use client";

import { useRef } from "react";
import type { FunctionDefinition } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Blocks, Send } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  selectedFunction: FunctionDefinition | null;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  selectedFunction,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && selectedFunction && !disabled) {
        onSend();
        // Reset height after send
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  };

  const canSend = !!value.trim() && !!selectedFunction && !disabled;

  return (
    <div className="border-t border-clay-600 bg-clay-800 p-3">
      {/* Function context chip */}
      {selectedFunction && (
        <div className="flex items-center gap-1.5 mb-2">
          <Blocks className="h-3 w-3 text-clay-400" />
          <span className="text-xs text-clay-300">
            Using {selectedFunction.name}
          </span>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type or paste your data..."
          rows={1}
          className="bg-clay-900 border border-clay-600 rounded-xl px-4 py-3 text-sm text-clay-100 placeholder:text-clay-400 resize-none min-h-[44px] max-h-[160px] w-full focus:outline-none focus:ring-1 focus:ring-kiln-teal/50 focus:border-kiln-teal/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onSend}
          disabled={!canSend}
          className={
            canSend
              ? "text-kiln-teal hover:text-kiln-teal hover:bg-kiln-teal/10 shrink-0"
              : "text-clay-400 cursor-not-allowed shrink-0"
          }
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
