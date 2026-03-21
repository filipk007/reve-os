"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { ChatThread } from "@/components/chat/chat-thread";
import { ChatInput } from "@/components/chat/chat-input";
import { FunctionPicker } from "@/components/chat/function-picker";

export default function ChatPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Chat" />
          <div className="flex-1 flex items-center justify-center text-clay-300">
            Loading...
          </div>
        </div>
      }
    >
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const chat = useChat();

  return (
    <div className="flex flex-col h-full">
      <Header title="Chat" />
      <div className="flex-1 overflow-hidden flex">
        {/* Session list panel -- Plan 03 will add SessionList here */}

        {/* Chat thread area */}
        <div className="flex-1 flex flex-col min-w-0">
          <FunctionPicker
            functions={chat.functions}
            functionsByFolder={chat.functionsByFolder}
            selectedFunction={chat.selectedFunction}
            onSelect={(func) => {
              chat.selectFunction(func);
              if (!chat.activeSession) {
                chat.createSession(func.id);
              }
            }}
            disabled={!!chat.activeSession}
          />

          <ChatThread
            messages={chat.messages}
            streaming={chat.streaming}
          />

          <ChatInput
            value={chat.inputValue}
            onChange={chat.setInputValue}
            onSend={chat.sendMessage}
            disabled={chat.streaming || !chat.activeSession}
            selectedFunction={chat.selectedFunction}
          />
        </div>

        {/* Activity panel placeholder -- Phase 3 fills this */}
        <div className="hidden lg:flex w-80 border-l border-clay-600 flex-col items-center justify-center p-6">
          <EmptyState
            title="Activity"
            description="Execution details will appear here when you run a function."
            icon={Activity}
          />
        </div>
      </div>
    </div>
  );
}
