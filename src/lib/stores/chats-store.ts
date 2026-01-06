import { create } from "zustand";
import type { Chat, ChatMessage } from "../projects-api";
import {
  createChat as apiCreateChat,
  getChats as apiGetChats,
  getChatMessages as apiGetChatMessages,
  updateChatTitle as apiUpdateChatTitle,
  streamChatMessage as apiStreamChatMessage,
} from "../projects-api";

export type ChatWithMessages = Chat & {
  messages: ChatMessage[];
  isStreaming?: boolean;
};

type ChatsStore = {
  chatsByProject: Record<string, ChatWithMessages[]>;
  isLoading: Record<string, boolean>;
  setChats: (projectId: string, chats: ChatWithMessages[]) => void;
  addChat: (projectId: string, chat: ChatWithMessages) => void;
  updateChat: (
    projectId: string,
    chatId: string,
    updates: Partial<ChatWithMessages>
  ) => void;
  addMessage: (
    projectId: string,
    chatId: string,
    message: ChatMessage
  ) => void;
  updateMessage: (
    projectId: string,
    chatId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ) => void;
  setLoading: (projectId: string, loading: boolean) => void;
  fetchChats: (projectId: string) => Promise<void>;
  fetchChatMessages: (projectId: string, chatId: string) => Promise<void>;
  createChat: (projectId: string, title?: string) => Promise<ChatWithMessages>;
  sendMessage: (
    projectId: string,
    chatId: string,
    message: string
  ) => Promise<void>;
  updateChatTitleAction: (
    projectId: string,
    chatId: string,
    title: string
  ) => Promise<void>;
};

export const useChatsStore = create<ChatsStore>((set, get) => ({
  chatsByProject: {},
  isLoading: {},

  setChats: (projectId, chats) =>
    set((state) => ({
      chatsByProject: {
        ...state.chatsByProject,
        [projectId]: chats,
      },
    })),

  addChat: (projectId, chat) =>
    set((state) => {
      const existing = state.chatsByProject[projectId] || [];
      return {
        chatsByProject: {
          ...state.chatsByProject,
          [projectId]: [chat, ...existing],
        },
      };
    }),

  updateChat: (projectId, chatId, updates) =>
    set((state) => {
      const chats = state.chatsByProject[projectId] || [];
      return {
        chatsByProject: {
          ...state.chatsByProject,
          [projectId]: chats.map((c) =>
            c.id === chatId ? { ...c, ...updates } : c
          ),
        },
      };
    }),

  addMessage: (projectId, chatId, message) =>
    set((state) => {
      const chats = state.chatsByProject[projectId] || [];
      return {
        chatsByProject: {
          ...state.chatsByProject,
          [projectId]: chats.map((c) =>
            c.id === chatId
              ? { ...c, messages: [...c.messages, message] }
              : c
          ),
        },
      };
    }),

  updateMessage: (projectId, chatId, messageId, updates) =>
    set((state) => {
      const chats = state.chatsByProject[projectId] || [];
      return {
        chatsByProject: {
          ...state.chatsByProject,
          [projectId]: chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                }
              : c
          ),
        },
      };
    }),

  setLoading: (projectId, loading) =>
    set((state) => ({
      isLoading: {
        ...state.isLoading,
        [projectId]: loading,
      },
    })),

  fetchChats: async (projectId) => {
    get().setLoading(projectId, true);
    try {
      const chats = await apiGetChats(projectId);
      const existingChats = get().chatsByProject[projectId] || [];
      
      // Merge fetched chats with existing ones, preserving messages
      const chatsWithMessages: ChatWithMessages[] = chats.map((chat) => {
        const existingChat = existingChats.find((c) => c.id === chat.id);
        return {
          ...chat,
          // Preserve existing messages if we have them
          messages: existingChat?.messages || [],
          isStreaming: existingChat?.isStreaming || false,
        };
      });
      
      // Also keep any local chats that aren't in the API response yet
      const localOnlyChats = existingChats.filter(
        (existing) => !chats.find((c) => c.id === existing.id)
      );
      
      get().setChats(projectId, [...localOnlyChats, ...chatsWithMessages]);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    } finally {
      get().setLoading(projectId, false);
    }
  },

  fetchChatMessages: async (projectId, chatId) => {
    try {
      const messages = await apiGetChatMessages(projectId, chatId);
      // Only update if we don't have messages already (don't overwrite local messages)
      const currentChat = get().chatsByProject[projectId]?.find((c) => c.id === chatId);
      if (!currentChat || currentChat.messages.length === 0) {
        get().updateChat(projectId, chatId, { messages });
      }
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    }
  },

  createChat: async (projectId, title) => {
    const response = await apiCreateChat(projectId, title);
    const now = new Date().toISOString();
    const chat: ChatWithMessages = {
      id: response.chatId,
      title: response.title || title || "New Chat",
      created_at: now,
      updated_at: now,
      messages: [],
    };
    get().addChat(projectId, chat);
    return chat;
  },

  sendMessage: async (projectId, chatId, messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    const now = new Date().toISOString();

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      created_at: now,
    };
    get().addMessage(projectId, chatId, userMessage);

    // Update chat's updated_at timestamp
    get().updateChat(projectId, chatId, { updated_at: now });

    // Add streaming assistant message placeholder
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      created_at: now,
    };
    get().addMessage(projectId, chatId, assistantMessage);
    get().updateChat(projectId, chatId, { isStreaming: true });

    try {
      await apiStreamChatMessage(projectId, chatId, trimmed, {
        onChunk: (chunk) => {
          // Get fresh state to ensure we have the latest message content
          const currentChat = get().chatsByProject[projectId]?.find(
            (c) => c.id === chatId
          );
          const currentMessage = currentChat?.messages.find(
            (m) => m.id === assistantMessageId
          );
          if (currentMessage) {
            get().updateMessage(projectId, chatId, assistantMessageId, {
              content: currentMessage.content + chunk,
            });
          }
        },
        onDone: (data) => {
          // Finalize the message with complete response if provided
          if (data?.response) {
            get().updateMessage(projectId, chatId, assistantMessageId, {
              content: data.response,
            });
          }
          // Update chat's updated_at on completion
          get().updateChat(projectId, chatId, { 
            isStreaming: false,
            updated_at: new Date().toISOString()
          });
        },
        onError: (error) => {
          get().updateMessage(projectId, chatId, assistantMessageId, {
            content: `Error: ${error}`,
          });
          get().updateChat(projectId, chatId, { isStreaming: false });
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send message";
      get().updateMessage(projectId, chatId, assistantMessageId, {
        content: `Error: ${errorMessage}`,
      });
      get().updateChat(projectId, chatId, { isStreaming: false });
    }
  },

  updateChatTitleAction: async (projectId, chatId, title) => {
    try {
      await apiUpdateChatTitle(projectId, chatId, title);
      get().updateChat(projectId, chatId, { title });
    } catch (error) {
      console.error("Failed to update chat title:", error);
    }
  },
}));

