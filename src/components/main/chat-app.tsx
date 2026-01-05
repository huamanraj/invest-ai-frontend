"use client";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { ChatSidebar } from "./chat-sidebar";
import { ChatContent } from "./chat-content";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LinkChatSession,
  loadLinkChats,
  makeJobId,
  normalizeUrl,
  updateLinkChat,
  upsertLinkChat,
  urlToTitle,
} from "@/lib/link-chat-store";

type Params = { jobId?: string };

function computeProcessingStep(processingStartedAt: number) {
  const elapsed = Date.now() - processingStartedAt;
  if (elapsed < 650) return 0;
  if (elapsed < 1250) return 1;
  if (elapsed < 1900) return 2;
  if (elapsed < 2450) return 3;
  return 4;
}

function FullChatApp() {
  const router = useRouter();
  const params = useParams<Params>();
  const activeChatId = typeof params?.jobId === "string" ? params.jobId : null;

  const [chats, setChats] = useState<LinkChatSession[]>([]);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    setChats(loadLinkChats());
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    return chats.find((c) => c.id === activeChatId) ?? null;
  }, [chats, activeChatId]);

  const ensureProcessingTimers = (chat: LinkChatSession) => {
    if (chat.status !== "processing" || !chat.processingStartedAt) return;

    // Clear existing timers and re-schedule for this job.
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];

    const msToReady = Math.max(0, chat.processingStartedAt + 2450 - Date.now());

    const t = window.setTimeout(() => {
      const nextChats = updateLinkChat(chat.id, (prev) => {
        if (prev.status === "ready") return prev;
        const next: LinkChatSession = {
          ...prev,
          status: "ready",
          messages: [
            ...prev.messages,
            {
              id: prev.messages.length + 1,
              role: "assistant",
              content:
                "Scrape complete (dummy). You can now chat with the link content.",
            },
          ],
        };
        return next;
      });
      setChats(nextChats);
    }, msToReady);

    timersRef.current.push(t);
  };

  useEffect(() => {
    if (!activeChat) return;
    ensureProcessingTimers(activeChat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.id, activeChat?.status]);

  const handleNewChat = () => {
    router.push(`/`);
  };

  const handleSelectChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleStartLinkChat = (rawUrl: string) => {
    const url = normalizeUrl(rawUrl);
    if (!url) return { ok: false as const, error: "Please paste a link to continue." };

    const id = makeJobId();
    const createdAt = Date.now();

    const session: LinkChatSession = {
      id,
      url,
      title: urlToTitle(url),
      createdAt,
      status: "processing",
      processingStartedAt: createdAt,
      messages: [
        {
          id: 1,
          role: "assistant",
          content: `Starting scrape for:\n\n${url}\n\nHang tight — I’ll enable chat when it’s ready.`,
        },
      ],
    };

    const next = upsertLinkChat(session);
    setChats(next);
    router.push(`/chat/${id}`);
    return { ok: true as const };
  };

  const handleSendMessage = (chatId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const nextAfterUser = updateLinkChat(chatId, (prev) => {
      const userMsgId = prev.messages.length + 1;
      return {
        ...prev,
        messages: [...prev.messages, { id: userMsgId, role: "user", content: trimmed }],
      };
    });

    setChats(nextAfterUser);

    const t = window.setTimeout(() => {
      const nextAfterAssistant = updateLinkChat(chatId, (prev) => {
        const assistantMsgId = prev.messages.length + 1;
        return {
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: assistantMsgId,
              role: "assistant",
              content: `This is a response to: "${trimmed}"`,
            },
          ],
        };
      });
      setChats(nextAfterAssistant);
    }, 900);

    timersRef.current.push(t);
  };

  const processingStep = useMemo(() => {
    if (!activeChat || activeChat.status !== "processing" || !activeChat.processingStartedAt) {
      return 0;
    }
    return computeProcessingStep(activeChat.processingStartedAt);
  }, [activeChat]);

  return (
    <SidebarProvider>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
      />
      <SidebarInset>
        <ChatContent
          activeChat={activeChat}
          activeChatId={activeChatId}
          processingStep={processingStep}
          onStartLinkChatAction={handleStartLinkChat}
          onSendMessageAction={handleSendMessage}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}

export { FullChatApp };
