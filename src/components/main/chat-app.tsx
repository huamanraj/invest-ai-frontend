"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "./chat-sidebar";
import { ChatContent } from "./chat-content";
import { useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { normalizeUrl } from "@/lib/link-chat-store";
import { useProjectsStore } from "@/lib/stores/projects-store";
import { useChatsStore } from "@/lib/stores/chats-store";

type Params = { projectId?: string; chatId?: string };

function FullChatApp() {
  const router = useRouter();
  const params = useParams<Params>();
  const activeProjectId =
    typeof params?.projectId === "string" ? params.projectId : null;
  const activeChatId =
    typeof params?.chatId === "string" ? params.chatId : null;

  const { projects, fetchProjects, createProject, subscribeToProject } =
    useProjectsStore();
  const {
    chatsByProject,
    fetchChats,
    fetchChatMessages,
    createChat,
    sendMessage,
    updateChatTitleAction,
  } = useChatsStore();

  const eventSourceCleanupRef = useRef<(() => void) | null>(null);
  const pendingMessageRef = useRef<string | null>(null);
  const fetchedChatsRef = useRef<Set<string>>(new Set());

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Reset fetched chats when project changes
  useEffect(() => {
    fetchedChatsRef.current.clear();
  }, [activeProjectId]);

  // Fetch chats for active project (only if we don't have them)
  useEffect(() => {
    if (activeProjectId) {
      const existingChats = useChatsStore.getState().chatsByProject[activeProjectId];
      // Only fetch if we don't have chats yet
      if (!existingChats || existingChats.length === 0) {
        fetchChats(activeProjectId);
      }
    }
  }, [activeProjectId, fetchChats]);

  // Subscribe to project events when viewing a processing project
  useEffect(() => {
    if (eventSourceCleanupRef.current) {
      eventSourceCleanupRef.current();
      eventSourceCleanupRef.current = null;
    }

    if (!activeProjectId) return;

    const project = projects.find((p) => p.id === activeProjectId);
    if (!project) return;

    const isProcessing =
      project.status !== "completed" && project.status !== "failed";

    if (!isProcessing) return;

    const cleanup = subscribeToProject(activeProjectId, {
      onStatus: (status) => {
        // Status updated via store
      },
      onComplete: () => {
        // Project completed, refresh chats
        if (activeProjectId) {
          fetchChats(activeProjectId);
        }
      },
      onError: (error) => {
        console.error("Project processing error:", error);
      },
    });

    eventSourceCleanupRef.current = cleanup;

    return () => {
      if (eventSourceCleanupRef.current) {
        eventSourceCleanupRef.current();
        eventSourceCleanupRef.current = null;
      }
    };
  }, [activeProjectId, projects, subscribeToProject, fetchChats]);

  // Fetch chat messages when navigating to a chat
  useEffect(() => {
    if (!activeProjectId || !activeChatId) return;

    const chatKey = `${activeProjectId}:${activeChatId}`;
    
    // Skip if we've already fetched or are about to send a message
    if (fetchedChatsRef.current.has(chatKey) || pendingMessageRef.current) {
      return;
    }

    // Get fresh state from store
    const currentChats = useChatsStore.getState().chatsByProject[activeProjectId];
    const chat = currentChats?.find((c) => c.id === activeChatId);
    
    // Don't fetch if:
    // - Chat doesn't exist yet (will be created)
    // - Chat already has messages (might be streaming or already loaded)
    if (!chat || chat.messages.length > 0) return;

    // Mark as fetched before making the call
    fetchedChatsRef.current.add(chatKey);
    fetchChatMessages(activeProjectId, activeChatId);
  }, [activeProjectId, activeChatId, fetchChatMessages]);

  // Handle pending message after chat creation
  useEffect(() => {
    // Check both ref and sessionStorage
    const pendingFromRef = pendingMessageRef.current;
    const pendingFromStorage = typeof window !== 'undefined' ? sessionStorage.getItem('pendingMessage') : null;
    const pendingMessage = pendingFromRef || pendingFromStorage;

    if (!activeProjectId || !activeChatId || !pendingMessage) {
      return;
    }

    // Get fresh state from store
    const currentChats = useChatsStore.getState().chatsByProject[activeProjectId];
    const chat = currentChats?.find((c) => c.id === activeChatId);
    
    // Wait for chat to be available in store
    if (!chat) {
      // Retry after a short delay - chat might not be in store yet
      const timeout = setTimeout(() => {
        const retryChats = useChatsStore.getState().chatsByProject[activeProjectId];
        const retryChat = retryChats?.find((c) => c.id === activeChatId);
        const retryMessage = pendingMessageRef.current || sessionStorage.getItem('pendingMessage');
        if (retryChat && retryMessage) {
          pendingMessageRef.current = null;
          sessionStorage.removeItem('pendingMessage');

          // Mark this chat as fetched to prevent message fetch
          const chatKey = `${activeProjectId}:${activeChatId}`;
          fetchedChatsRef.current.add(chatKey);

          // Send the pending message immediately - title was already set during creation
          sendMessage(activeProjectId, activeChatId, retryMessage);
        }
      }, 300);
      return () => clearTimeout(timeout);
    }

    // Clear both ref and storage
    pendingMessageRef.current = null;
    sessionStorage.removeItem('pendingMessage');

    // Mark this chat as fetched to prevent message fetch
    const chatKey = `${activeProjectId}:${activeChatId}`;
    fetchedChatsRef.current.add(chatKey);

    // Send the pending message immediately - title was already set during creation
    sendMessage(activeProjectId, activeChatId, pendingMessage);
  }, [activeProjectId, activeChatId, sendMessage]);

  const handleNewProject = useCallback(() => {
    router.push(`/`);
  }, [router]);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      router.push(`/project/${projectId}`);
    },
    [router]
  );

  const handleStartProject = useCallback(
    async (
      rawUrl: string
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      const url = normalizeUrl(rawUrl);
      if (!url) {
        return { ok: false, error: "Please paste a valid link to continue." };
      }

      try {
        const project = await createProject(url);
        router.push(`/project/${project.id}`);
        return { ok: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create project";
        return { ok: false, error: message };
      }
    },
    [createProject, router]
  );

  const handleCreateChat = useCallback(async () => {
    if (!activeProjectId) return;

    try {
      const chat = await createChat(activeProjectId);
      router.push(`/project/${activeProjectId}/chat/${chat.id}`);
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  }, [activeProjectId, createChat, router]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      if (!activeProjectId) return;
      router.push(`/project/${activeProjectId}/chat/${chatId}`);
    },
    [activeProjectId, router]
  );

  // Handle creating chat with initial message
  const handleCreateChatWithMessage = useCallback(
    async (message?: string) => {
      if (!activeProjectId) return;

      try {
        // Store message before creating chat to ensure it's available
        if (message) {
          pendingMessageRef.current = message;
          // Also store in sessionStorage as backup
          sessionStorage.setItem('pendingMessage', message);
        }
        
        // Create chat with the message as title (first 50 chars)
        const chatTitle = message ? message.substring(0, 50) : undefined;
        const chat = await createChat(activeProjectId, chatTitle);
        
        // Navigate to the chat page
        router.push(`/project/${activeProjectId}/chat/${chat.id}`);
      } catch (err) {
        console.error("Failed to create chat:", err);
        // Clear pending message on error
        pendingMessageRef.current = null;
        sessionStorage.removeItem('pendingMessage');
      }
    },
    [activeProjectId, createChat, router]
  );

  return (
    <SidebarProvider>
      <ChatSidebar
        activeProjectId={activeProjectId}
        onNewProject={handleNewProject}
        onSelectProject={handleSelectProject}
      />
      <SidebarInset>
        <ChatContent
          activeProjectId={activeProjectId}
          activeChatId={activeChatId}
          onStartProjectAction={handleStartProject}
          onSelectChat={handleSelectChat}
          onCreateChat={handleCreateChatWithMessage}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}

export { FullChatApp };
