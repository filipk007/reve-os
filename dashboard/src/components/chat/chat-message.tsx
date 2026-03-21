"use client";

import type { ChannelMessage } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { ResultCard } from "./result-card";

interface ChatMessageProps {
  message: ChannelMessage;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.content.startsWith("Processing failed");
  const hasResults =
    message.results && message.results.length > 0;

  return (
    <div
      className={
        isUser ? "flex justify-end" : "flex justify-start"
      }
    >
      <div className="max-w-[80%]">
        <div
          className={
            isUser
              ? "bg-clay-700 text-clay-100 rounded-2xl rounded-br-md px-4 py-2.5"
              : "bg-[#141416] text-clay-100 border border-clay-700 rounded-2xl rounded-bl-md px-4 py-2.5"
          }
        >
          {/* Message content */}
          {message.content && (
            <p
              className={
                isError
                  ? "text-sm text-kiln-coral"
                  : "text-sm whitespace-pre-wrap"
              }
            >
              {message.content}
              {/* Streaming pulse indicator */}
              {isStreaming && !hasResults && !isError && (
                <span className="animate-pulse bg-kiln-teal rounded-full h-2 w-2 inline-block ml-2 align-middle" />
              )}
            </p>
          )}

          {/* Structured results */}
          {hasResults && (
            <ResultCard results={message.results!} />
          )}
        </div>

        {/* Timestamp */}
        <div
          className={
            isUser
              ? "text-[11px] text-clay-300 font-mono tabular-nums mt-1 text-right"
              : "text-[11px] text-clay-300 font-mono tabular-nums mt-1"
          }
        >
          {formatRelativeTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
