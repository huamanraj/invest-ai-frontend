"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatMessagesContainer } from "./chat-messages-container";
import { ChatPromptInput } from "./chat-prompt-input";
import { DarkModeToggle } from "./dark-mode-toggle";
import type { LinkChatSession } from "@/lib/link-chat-store";
import { isProcessingStatus, isReadyStatus } from "@/lib/link-chat-store";
import { LinkPromptInput } from "./link-prompt-input";
import { LinkProcessingPanel } from "./link-processing-panel";
import { Greeting } from "./greeting";

type ChatContentProps = {
  activeChat: LinkChatSession | null;
  activeChatId: string | null;
  processingStep: number;
  onStartLinkChatAction: (
    rawUrl: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onSendMessageAction: (chatId: string, text: string) => void;
};

export function ChatContent({
  activeChat,
  activeChatId,
  processingStep,
  onStartLinkChatAction,
  onSendMessageAction,
}: ChatContentProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const isProcessing = activeChat ? isProcessingStatus(activeChat.status) : false;
  const canChat = activeChat ? isReadyStatus(activeChat.status) : false;
  const isFailed = activeChat?.status === "failed";

  useEffect(() => {
    // Reset local message input on chat switch.
    setPrompt("");
    setIsLoading(false);
  }, [activeChatId]);

  const title = useMemo(() => {
    if (!activeChat) return "New link chat";
    return activeChat.companyName || activeChat.title || "Link chat";
  }, [activeChat]);

  const subtitle = useMemo(() => {
    if (!activeChat) return "Paste a BSE India annual report link below to start";
    if (isFailed) return `Failed: ${activeChat.errorMessage || "Unknown error"}`;
    return activeChat.url;
  }, [activeChat, isFailed]);

  const messages = activeChat?.messages ?? [];

  // Check if there's a streaming message
  const hasStreamingMessage = messages.some((m) => m.isStreaming);

  const handleChatSubmit = async () => {
    if (!activeChatId) return;
    if (!prompt.trim()) return;
    if (!canChat) return;

    const text = prompt.trim();
    setPrompt("");
    setIsLoading(true);

    try {
      await onSendMessageAction(activeChatId, text);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkSubmit = async () => {
    setLinkError(null);
    setIsSubmittingLink(true);

    try {
      const res = await onStartLinkChatAction(linkInput);
      if (!res.ok) {
        setLinkError(res.error);
      } else {
        // Clear input on success
        setLinkInput("");
      }
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmittingLink(false);
    }
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <div className="flex min-w-0 flex-col">
            <div className="text-foreground leading-5">{title}</div>
            <div
              className={`max-w-[70vw] truncate text-xs leading-4 ${
                isFailed ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {subtitle}
            </div>
          </div>
        </div>
        <DarkModeToggle />
      </header>

      {!activeChat ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="mb-2">
            <Greeting />
          </div>
          <LinkPromptInput
            variant="center"
            value={linkInput}
            onValueChange={setLinkInput}
            onSubmit={handleLinkSubmit}
            isLoading={isSubmittingLink}
            error={linkError}
          />
        </div>
      ) : (
        <>
          <ChatMessagesContainer
            messages={messages}
            containerRef={chatContainerRef}
            topContent={
              isProcessing ? (
                <LinkProcessingPanel
                  step={processingStep}
                  url={activeChat.url}
                  status={activeChat.status}
                />
              ) : null
            }
          />

          <ChatPromptInput
            isLoading={isLoading || hasStreamingMessage}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={handleChatSubmit}
            disabled={!canChat || isProcessing || isFailed}
          />
        </>
      )}
    </main>
  );
}
