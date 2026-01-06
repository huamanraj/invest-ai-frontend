"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatMessagesContainer } from "./chat-messages-container";
import { ChatPromptInput } from "./chat-prompt-input";
import { DarkModeToggle } from "./dark-mode-toggle";
import { LinkPromptInput } from "./link-prompt-input";
import { LinkProcessingPanel } from "./link-processing-panel";
import { Greeting } from "./greeting";
import { ProjectChatList } from "./project-chat-list";
import { useProjectsStore } from "@/lib/stores/projects-store";
import { useChatsStore } from "@/lib/stores/chats-store";
import type { ProjectStatus } from "@/lib/projects-api";

function statusToProcessingStep(status: ProjectStatus): number {
  switch (status) {
    case "pending":
      return 0;
    case "scraping":
      return 1;
    case "downloading":
      return 2;
    case "parsing":
      return 3;
    case "embedding":
      return 4;
    case "completed":
      return 5;
    case "failed":
      return -1;
    default:
      return 0;
  }
}

type ChatContentProps = {
  activeProjectId: string | null;
  activeChatId: string | null;
  onStartProjectAction: (
    rawUrl: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (initialMessage?: string) => void;
};

function isProcessingStatus(status: ProjectStatus): boolean {
  return ["pending", "scraping", "downloading", "parsing", "embedding"].includes(
    status
  );
}

function isReadyStatus(status: ProjectStatus): boolean {
  return status === "completed";
}

export function ChatContent({
  activeProjectId,
  activeChatId,
  onStartProjectAction,
  onSelectChat,
  onCreateChat,
}: ChatContentProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { projects } = useProjectsStore();
  const { chatsByProject, sendMessage } = useChatsStore();

  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)
    : null;

  const activeChat = useMemo(() => {
    if (!activeProjectId || !activeChatId) return null;
    return chatsByProject[activeProjectId]?.find((c) => c.id === activeChatId) ?? null;
  }, [activeProjectId, activeChatId, chatsByProject]);

  const isProcessing = activeProject ? isProcessingStatus(activeProject.status) : false;
  const canChat = activeProject ? isReadyStatus(activeProject.status) : false;
  const isFailed = activeProject?.status === "failed";

  useEffect(() => {
    setPrompt("");
    setIsLoading(false);
  }, [activeChatId]);

  const title = useMemo(() => {
    if (!activeProject) return "New Project";
    if (activeChat) return activeChat.title;
    return activeProject.name || activeProject.company_name || "Project";
  }, [activeProject, activeChat]);

  const subtitle = useMemo(() => {
    if (!activeProject) return "Paste a BSE India annual report link below to start";
    if (isFailed) return `Failed: ${activeProject.error_message || "Unknown error"}`;
    if (activeChat) return activeProject.company_name || activeProject.name;
    return activeProject.url;
  }, [activeProject, activeChat, isFailed]);

  const messages = activeChat?.messages ?? [];

  const hasStreamingMessage = activeChat?.isStreaming ?? false;

  const processingStep = useMemo(() => {
    if (!activeProject) return 0;
    return statusToProcessingStep(activeProject.status);
  }, [activeProject]);

  const handleChatSubmit = async () => {
    if (!activeProjectId || !activeChatId) return;
    if (!prompt.trim()) return;
    if (!canChat) return;

    const text = prompt.trim();
    setPrompt("");
    setIsLoading(true);

    try {
      await sendMessage(activeProjectId, activeChatId, text);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkSubmit = async () => {
    setLinkError(null);
    setIsSubmittingLink(true);

    try {
      const res = await onStartProjectAction(linkInput);
      if (!res.ok) {
        setLinkError(res.error);
      } else {
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

      {!activeProject ? (
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
      ) : isProcessing ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatMessagesContainer
            messages={[]}
            containerRef={chatContainerRef}
            topContent={
              <LinkProcessingPanel
                step={processingStep}
                url={activeProject.url}
                status={activeProject.status}
              />
            }
          />
        </div>
      ) : activeChat ? (
        <>
          <ChatMessagesContainer
            messages={messages.map((m, idx) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              isStreaming:
                idx === messages.length - 1 &&
                m.role === "assistant" &&
                hasStreamingMessage,
            }))}
            containerRef={chatContainerRef}
          />
          <ChatPromptInput
            isLoading={isLoading || hasStreamingMessage}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={handleChatSubmit}
            disabled={!canChat || isProcessing || isFailed}
          />
        </>
      ) : !activeChatId ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 flex flex-col px-4 py-10">
            <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full gap-8">
              <div className="w-full">
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    {activeProject.name || activeProject.company_name}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {activeProject.company_name || activeProject.name}
                  </p>
                </div>
                <ChatPromptInput
                  isLoading={false}
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  onSubmit={async () => {
                    if (!prompt.trim() || !activeProjectId) return;
                    const text = prompt.trim();
                    setPrompt("");
                    await onCreateChat(text);
                  }}
                  disabled={!canChat}
                />
              </div>
              <div className="w-full flex-1 min-h-0">
                <ProjectChatList
                  projectId={activeProjectId}
                  activeChatId={activeChatId}
                  onSelectChat={onSelectChat}
                  onCreateChat={() => onCreateChat()}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="text-center space-y-4">
            <div className="animate-pulse text-muted-foreground">
              Loading chat...
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
