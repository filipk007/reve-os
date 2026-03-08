"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Editor pane with line numbers and {{variable}} highlighting overlay.
 * Uses a transparent textarea + pre overlay technique.
 */
export function EditorPane({
  content,
  onChange,
  readOnly,
}: {
  content: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const lines = content.split("\n");

  // Sync scroll between textarea and overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Handle tab key for indentation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const newValue = value.substring(0, start) + "  " + value.substring(end);
        onChange(newValue);
        // Restore cursor position
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    },
    [onChange]
  );

  // Highlight {{variables}} in the content
  const highlightContent = (text: string) => {
    const parts = text.split(/({{[^}]+}})/g);
    return parts.map((part, i) => {
      if (part.match(/^{{[^}]+}}$/)) {
        return (
          <span key={i} className="text-kiln-teal font-medium">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex h-full overflow-hidden bg-clay-950 rounded-lg border border-clay-800">
      {/* Line numbers */}
      <div className="shrink-0 py-3 px-2 text-right select-none border-r border-clay-800 overflow-hidden bg-clay-900/50">
        {lines.map((_, i) => (
          <div
            key={i}
            className="text-[11px] leading-5 text-clay-600 font-[family-name:var(--font-mono)]"
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Editor area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Highlighted overlay */}
        <pre
          ref={preRef}
          aria-hidden
          className="absolute inset-0 py-3 px-3 text-sm leading-5 font-[family-name:var(--font-mono)] text-clay-200 whitespace-pre-wrap break-words overflow-hidden pointer-events-none"
        >
          {highlightContent(content)}
          {/* Extra line to match textarea scrolling */}
          {"\n"}
        </pre>

        {/* Transparent textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          className="absolute inset-0 w-full h-full py-3 px-3 text-sm leading-5 font-[family-name:var(--font-mono)] bg-transparent text-transparent caret-clay-200 resize-none outline-none selection:bg-kiln-teal/20"
        />
      </div>
    </div>
  );
}
