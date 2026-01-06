"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "./chat-sidebar";
import { ChatContent } from "./chat-content";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LinkChatSession,
  loadLinkChats,
  normalizeUrl,
  updateLinkChat,
  upsertLinkChat,
  urlToTitle,
  statusToProcessingStep,
  isProcessingStatus,
  isReadyStatus,
  jobStatusToLinkStatus,
} from "@/lib/link-chat-store";
import {
  createJob,
  getJob,
  listJobs,
  streamChat,
  subscribeToJobEvents,
  getChatSessions,
  getSessionMessages,
  type JobStatus,
} from "@/lib/api";

type Params = { jobId?: string };

function FullChatApp() {
  const router = useRouter();
  const params = useParams<Params>();
  const activeChatId = typeof params?.jobId === "string" ? params.jobId : null;

  const [chats, setChats] = useState<LinkChatSession[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const eventSourceCleanupRef = useRef<(() => void) | null>(null);
  const loadedChatHistoryRef = useRef<Set<string>>(new Set());

  // Load chats from localStorage on mount, then sync with API
  useEffect(() => {
    const localChats = loadLinkChats();
    setChats(localChats);

    // Fetch jobs from API to sync
    listJobs()
      .then((jobs) => {
        const mergedChats = [...localChats];

        for (const job of jobs) {
          const existingIdx = mergedChats.findIndex((c) => c.id === job.id);
          const status = jobStatusToLinkStatus(job.status);

          if (existingIdx === -1) {
            // New job from API, add it
            mergedChats.unshift({
              id: job.id,
              url: job.url,
              title: job.company_name || urlToTitle(job.url),
              createdAt: new Date(job.created_at).getTime(),
              status,
              companyName: job.company_name,
              errorMessage: job.error_message || undefined,
              messages: [],
            });
          } else {
            // Update existing chat with API status
            mergedChats[existingIdx] = {
              ...mergedChats[existingIdx],
              status,
              title: job.company_name || mergedChats[existingIdx].title,
              companyName: job.company_name,
              errorMessage: job.error_message || undefined,
            };
          }
        }

        // Sort by createdAt descending
        mergedChats.sort((a, b) => b.createdAt - a.createdAt);
        setChats(mergedChats);
      })
      .catch((err) => {
        console.error("Failed to fetch jobs:", err);
      })
      .finally(() => {
        setIsInitialized(true);
      });
  }, []);

  // Get active chat from state
  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    return chats.find((c) => c.id === activeChatId) ?? null;
  }, [chats, activeChatId]);

  // Subscribe to job events when viewing a processing job
  useEffect(() => {
    // Clean up previous subscription
    if (eventSourceCleanupRef.current) {
      eventSourceCleanupRef.current();
      eventSourceCleanupRef.current = null;
    }

    if (!activeChat || !isProcessingStatus(activeChat.status)) {
      return;
    }

    const cleanup = subscribeToJobEvents(activeChat.id, {
      onStatus: (status: JobStatus, message: string) => {
        // Only update status, don't add progress messages
        const nextChats = updateLinkChat(activeChat.id, (prev) => ({
          ...prev,
          status: jobStatusToLinkStatus(status),
        }));
        setChats(nextChats);
      },
      onProgress: (message: string) => {
        // Don't show progress messages
        console.log("Progress:", message);
      },
      onComplete: (data) => {
        const nextChats = updateLinkChat(activeChat.id, (prev) => {
          const companyName = prev.companyName || prev.title;
          return {
            ...prev,
            status: "completed" as const,
            messages: [
              ...prev.messages,
              {
                id: `complete-${Date.now()}`,
                role: "assistant" as const,
                content: `Analysis complete! You can now ask questions about ${companyName}'s annual report.`,
              },
            ],
          };
        });
        setChats(nextChats);
      },
      onError: (error: string) => {
        const nextChats = updateLinkChat(activeChat.id, (prev) => ({
          ...prev,
          status: "failed" as const,
          errorMessage: error,
          messages: [
            ...prev.messages,
            {
              id: `error-${Date.now()}`,
              role: "assistant" as const,
              content: `Error: ${error}`,
            },
          ],
        }));
        setChats(nextChats);
      },
    });

    eventSourceCleanupRef.current = cleanup;

    return () => {
      if (eventSourceCleanupRef.current) {
        eventSourceCleanupRef.current();
        eventSourceCleanupRef.current = null;
      }
    };
  }, [activeChat?.id, activeChat?.status]);

  // Reset loaded history tracking when activeChatId changes
  useEffect(() => {
    loadedChatHistoryRef.current.clear();
  }, [activeChatId]);

  // Fetch job status and chat history when navigating to a chat
  useEffect(() => {
    if (!activeChatId || !isInitialized) return;
    
    // Skip if we've already loaded history for this chat
    if (loadedChatHistoryRef.current.has(activeChatId)) {
      return;
    }

    // Get current chat state from localStorage (not from state to avoid dependency issues)
    const currentChat = loadLinkChats().find((c) => c.id === activeChatId);
    const hasLocalMessages = currentChat?.messages && currentChat.messages.length > 0;
    const hasSessionId = !!currentChat?.sessionId;

    // Fetch job status
    getJob(activeChatId)
      .then((job) => {
        const nextChats = updateLinkChat(activeChatId, (prev) => ({
          ...prev,
          status: jobStatusToLinkStatus(job.status),
          title: job.company_name || prev.title,
          companyName: job.company_name,
          errorMessage: job.error_message || undefined,
        }));
        setChats(nextChats);

        // Load chat history if job is completed
        if (job.status === "completed") {
          const loadMessages = (sessionId: string) => {
            return getSessionMessages(activeChatId, sessionId)
              .then((messages) => {
                if (!messages || messages.length === 0) {
                  return;
                }

                // Convert API messages to LinkChatMessage format
                const convertedMessages: LinkChatMessage[] = messages.map((msg) => ({
                  id: msg.id,
                  role: msg.role as "user" | "assistant",
                  content: msg.content,
                }));

                // Update chat with loaded messages
                const updatedChats = updateLinkChat(activeChatId, (prev) => {
                  // Replace all messages with API messages to ensure correct order
                  // This ensures we have the correct order and all messages from the server
                  return {
                    ...prev,
                    messages: convertedMessages.sort((a, b) => {
                      const aMsg = messages.find((m) => m.id === String(a.id));
                      const bMsg = messages.find((m) => m.id === String(b.id));
                      if (aMsg && bMsg) {
                        return (
                          new Date(aMsg.created_at).getTime() -
                          new Date(bMsg.created_at).getTime()
                        );
                      }
                      return 0;
                    }),
                  };
                });
                setChats(updatedChats);
                loadedChatHistoryRef.current.add(activeChatId);
              })
              .catch((err) => {
                console.error("Failed to load chat messages:", err);
                // If session doesn't exist yet, that's okay - it will be created on first message
              });
          };

          // If we already have a sessionId, use it
          if (hasSessionId && currentChat?.sessionId) {
            loadMessages(currentChat.sessionId);
          } else {
            // Otherwise, fetch sessions and use the latest one
            getChatSessions(activeChatId)
              .then((sessions) => {
                if (sessions.length === 0) {
                  // No sessions yet, keep existing messages
                  return;
                }

                // Use the most recent session (first one, assuming sorted by updated_at desc)
                const latestSession = sessions[0];

                // Update sessionId in chat
                const updatedChats = updateLinkChat(activeChatId, (prev) => ({
                  ...prev,
                  sessionId: latestSession.id,
                }));
                setChats(updatedChats);

                // Load messages for this session
                return loadMessages(latestSession.id);
              })
              .catch((err) => {
                console.error("Failed to load chat sessions:", err);
              });
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch job status:", err);
      });
  }, [activeChatId, isInitialized]);

  const handleNewChat = useCallback(() => {
    router.push(`/`);
  }, [router]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      router.push(`/chat/${chatId}`);
    },
    [router]
  );

  const handleStartLinkChat = useCallback(
    async (rawUrl: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      const url = normalizeUrl(rawUrl);
      if (!url) {
        return { ok: false, error: "Please paste a valid link to continue." };
      }

      try {
        // Call the API to create a job
        const response = await createJob(url);

        const session: LinkChatSession = {
          id: response.jobId,
          url,
          title: response.companyName || urlToTitle(url),
          createdAt: Date.now(),
          status: "pending",
          processingStartedAt: Date.now(),
          companyName: response.companyName,
          messages: [],
        };

        const next = upsertLinkChat(session);
        setChats(next);
        router.push(`/chat/${response.jobId}`);
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create job";
        return { ok: false, error: message };
      }
    },
    [router]
  );

  const handleSendMessage = useCallback(
    async (chatId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const chat = chats.find((c) => c.id === chatId);
      if (!chat || !isReadyStatus(chat.status)) return;

      // Add user message immediately
      const userMsgId = `user-${Date.now()}`;
      let nextChats = updateLinkChat(chatId, (prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { id: userMsgId, role: "user" as const, content: trimmed },
        ],
      }));
      setChats(nextChats);

      // Add streaming assistant message placeholder
      const assistantMsgId = `assistant-${Date.now()}`;
      nextChats = updateLinkChat(chatId, (prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: assistantMsgId,
            role: "assistant" as const,
            content: "",
            isStreaming: true,
          },
        ],
      }));
      setChats(nextChats);

      try {
        // Stream the response
        const { sessionId } = await streamChat(
          chatId,
          trimmed,
          chat.sessionId,
          {
            onChunk: (chunk) => {
              // Update the streaming message with new content
              const updatedChats = updateLinkChat(chatId, (prev) => {
                const messages = [...prev.messages];
                const idx = messages.findIndex((m) => m.id === assistantMsgId);
                if (idx !== -1) {
                  messages[idx] = {
                    ...messages[idx],
                    content: messages[idx].content + chunk,
                  };
                }
                return { ...prev, messages };
              });
              setChats(updatedChats);
            },
            onDone: () => {
              // Mark message as no longer streaming
              const updatedChats = updateLinkChat(chatId, (prev) => {
                const messages = [...prev.messages];
                const idx = messages.findIndex((m) => m.id === assistantMsgId);
                if (idx !== -1) {
                  messages[idx] = {
                    ...messages[idx],
                    isStreaming: false,
                  };
                }
                return { ...prev, messages };
              });
              setChats(updatedChats);
            },
            onError: (error) => {
              // Update message with error
              const updatedChats = updateLinkChat(chatId, (prev) => {
                const messages = [...prev.messages];
                const idx = messages.findIndex((m) => m.id === assistantMsgId);
                if (idx !== -1) {
                  messages[idx] = {
                    ...messages[idx],
                    content: `Error: ${error}`,
                    isStreaming: false,
                  };
                }
                return { ...prev, messages };
              });
              setChats(updatedChats);
            },
          }
        );

        // Update session ID if received
        if (sessionId) {
          const updatedChats = updateLinkChat(chatId, (prev) => ({
            ...prev,
            sessionId,
          }));
          setChats(updatedChats);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to send message";
        const updatedChats = updateLinkChat(chatId, (prev) => {
          const messages = [...prev.messages];
          const idx = messages.findIndex((m) => m.id === assistantMsgId);
          if (idx !== -1) {
            messages[idx] = {
              ...messages[idx],
              content: `Error: ${errorMessage}`,
              isStreaming: false,
            };
          }
          return { ...prev, messages };
        });
        setChats(updatedChats);
      }
    },
    [chats]
  );

  const processingStep = useMemo(() => {
    if (!activeChat) return 0;
    return statusToProcessingStep(activeChat.status);
  }, [activeChat]);

  return (
    <SidebarProvider>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        isLoading={!isInitialized}
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
