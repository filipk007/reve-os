"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  fetchFunctions,
  createChannel,
  fetchChannel,
  fetchChannels,
  streamChannelMessage,
} from "@/lib/api";
import type {
  FunctionDefinition,
  ChannelMessage,
  ChannelSession,
  ChannelSessionSummary,
} from "@/lib/types";
import { toast } from "sonner";

export interface UseChatReturn {
  // Session state
  sessions: ChannelSessionSummary[];
  activeSession: ChannelSession | null;

  // Message state
  messages: ChannelMessage[];
  streaming: boolean;
  streamProgress: { current: number; total: number } | null;

  // Function selection
  functions: FunctionDefinition[];
  functionsByFolder: Record<string, FunctionDefinition[]>;
  selectedFunction: FunctionDefinition | null;

  // Actions
  createSession: (functionId: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  sendMessage: () => void;
  selectFunction: (func: FunctionDefinition) => void;
  refreshSessions: () => Promise<void>;

  // Input state
  inputValue: string;
  setInputValue: (v: string) => void;

  // Loading
  loading: boolean;
}

export function useChat(): UseChatReturn {
  // Function state
  const [functions, setFunctions] = useState<FunctionDefinition[]>([]);
  const [selectedFunction, setSelectedFunction] =
    useState<FunctionDefinition | null>(null);

  // Session state
  const [sessions, setSessions] = useState<ChannelSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<ChannelSession | null>(
    null
  );

  // Message state
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Input state
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);

  // Stream abort ref
  const abortRef = useRef<AbortController | null>(null);

  // Group functions by folder
  const functionsByFolder = useMemo(() => {
    const grouped: Record<string, FunctionDefinition[]> = {};
    functions.forEach((f) => {
      const folder = f.folder || "Uncategorized";
      if (!grouped[folder]) grouped[folder] = [];
      grouped[folder].push(f);
    });
    return grouped;
  }, [functions]);

  // Load functions on mount
  useEffect(() => {
    fetchFunctions()
      .then(({ functions: funcs }) => {
        setFunctions(funcs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load sessions on mount
  useEffect(() => {
    fetchChannels()
      .then(({ sessions: sess }) => {
        setSessions(sess);
      })
      .catch(() => {});
  }, []);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const { sessions: sess } = await fetchChannels();
      setSessions(sess);
    } catch {
      // silent
    }
  }, []);

  const selectFunction = useCallback((func: FunctionDefinition) => {
    setSelectedFunction(func);
  }, []);

  const createSessionAction = useCallback(
    async (functionId: string) => {
      try {
        const session = await createChannel({ function_id: functionId });
        setActiveSession(session);
        setMessages(session.messages || []);
        await refreshSessions();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to create session"
        );
      }
    },
    [refreshSessions]
  );

  const loadSession = useCallback(async (sessionId: string) => {
    // Abort any active stream before switching
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setStreamProgress(null);

    try {
      const session = await fetchChannel(sessionId);
      setActiveSession(session);
      setMessages(session.messages || []);
      setSelectedFunction(null); // Will be determined by session
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load session");
    }
  }, []);

  const sendMessage = useCallback(() => {
    if (!activeSession || !inputValue.trim() || streaming) return;

    // Parse input: each non-empty line becomes a data row
    const lines = inputValue.split("\n").filter((l) => l.trim());
    const data = lines.map((l) => ({ value: l.trim() }));

    // Build user message
    const userMessage: ChannelMessage = {
      role: "user",
      content: inputValue,
      timestamp: Date.now() / 1000,
      data,
      results: null,
      execution_id: null,
    };

    // Build assistant placeholder
    const assistantPlaceholder: ChannelMessage = {
      role: "assistant",
      content: "Processing...",
      timestamp: Date.now() / 1000,
      data: null,
      results: null,
      execution_id: null,
    };

    // Optimistic update
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInputValue("");
    setStreaming(true);

    // SSE event handler
    const onEvent = (
      eventType: string,
      payload: Record<string, unknown>
    ) => {
      switch (eventType) {
        case "function_started":
          setStreamProgress({
            current: 0,
            total: (payload.total_rows as number) || 0,
          });
          break;

        case "row_processing":
          {
            const rowIndex = (payload.row_index as number) + 1;
            const totalRows = payload.total_rows as number;
            setStreamProgress({ current: rowIndex, total: totalRows });
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: `Processing ${rowIndex}/${totalRows}...`,
                };
              }
              return updated;
            });
          }
          break;

        case "row_complete":
          {
            const rowIdx = (payload.row_index as number) + 1;
            const total = payload.total_rows as number;
            setStreamProgress({ current: rowIdx, total });
          }
          break;

        case "row_error":
          {
            const errIdx = (payload.row_index as number) + 1;
            const errTotal = payload.total_rows as number;
            setStreamProgress({ current: errIdx, total: errTotal });
          }
          break;

        case "function_complete":
          setStreaming(false);
          setStreamProgress(null);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: "",
                results: (payload.results as Record<string, unknown>[]) || [],
              };
            }
            return updated;
          });
          // Refresh sessions to update message counts
          refreshSessions();
          break;

        case "error":
          setStreaming(false);
          setStreamProgress(null);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content:
                  "Processing failed -- check your data and try again.",
              };
            }
            return updated;
          });
          toast.error(
            (payload.error as string) || "Processing failed"
          );
          break;
      }
    };

    // SSE error handler
    const onError = (error: string) => {
      setStreaming(false);
      setStreamProgress(null);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: "Processing failed -- check your data and try again.",
          };
        }
        return updated;
      });
      toast.error(error);
    };

    // Start streaming
    const controller = streamChannelMessage(
      activeSession.id,
      inputValue,
      data,
      onEvent,
      onError
    );
    abortRef.current = controller;
  }, [activeSession, inputValue, streaming, refreshSessions]);

  return {
    sessions,
    activeSession,
    messages,
    streaming,
    streamProgress,
    functions,
    functionsByFolder,
    selectedFunction,
    createSession: createSessionAction,
    loadSession,
    sendMessage,
    selectFunction,
    refreshSessions,
    inputValue,
    setInputValue,
    loading,
  };
}
