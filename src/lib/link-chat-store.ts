import type { JobStatus } from "./api";

export type LinkChatMessage = {
  id: string | number;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

// Extended status to include all API statuses
export type LinkChatStatus =
  | "pending"
  | "scraping"
  | "downloading"
  | "parsing"
  | "embedding"
  | "completed"
  | "failed"
  | "processing" // Legacy/UI status
  | "ready"; // Legacy/UI status

export type LinkChatSession = {
  id: string;
  url: string;
  title: string;
  createdAt: number;
  status: LinkChatStatus;
  processingStartedAt?: number;
  messages: LinkChatMessage[];
  sessionId?: string; // Chat session ID from API
  errorMessage?: string;
  companyName?: string;
};

const STORAGE_KEY = "investai:linkChats:v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadLinkChats(): LinkChatSession[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<LinkChatSession[]>(
    window.localStorage.getItem(STORAGE_KEY)
  );
  if (!Array.isArray(parsed)) return [];
  return parsed;
}

export function saveLinkChats(chats: LinkChatSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

export function upsertLinkChat(chat: LinkChatSession) {
  const chats = loadLinkChats();
  const idx = chats.findIndex((c) => c.id === chat.id);
  if (idx === -1) {
    chats.unshift(chat);
  } else {
    chats[idx] = chat;
  }
  saveLinkChats(chats);
  return chats;
}

export function updateLinkChat(
  id: string,
  updater: (prev: LinkChatSession) => LinkChatSession
) {
  const chats = loadLinkChats();
  const idx = chats.findIndex((c) => c.id === id);
  if (idx === -1) return chats;
  const next = updater(chats[idx]);
  chats[idx] = next;
  saveLinkChats(chats);
  return chats;
}

export function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function urlToTitle(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "Link chat";
  }
}

// Map API status to processing step (0-4)
export function statusToProcessingStep(status: LinkChatStatus): number {
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
    case "ready":
      return 5;
    case "failed":
      return -1;
    case "processing":
      return 1;
    default:
      return 0;
  }
}

// Check if status means processing is ongoing
export function isProcessingStatus(status: LinkChatStatus): boolean {
  return ["pending", "scraping", "downloading", "parsing", "embedding", "processing"].includes(
    status
  );
}

// Check if status means ready for chat
export function isReadyStatus(status: LinkChatStatus): boolean {
  return status === "completed" || status === "ready";
}

// Map API JobStatus to LinkChatStatus
export function jobStatusToLinkStatus(jobStatus: JobStatus): LinkChatStatus {
  return jobStatus as LinkChatStatus;
}
