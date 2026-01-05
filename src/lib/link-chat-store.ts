export type LinkChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export type LinkChatStatus = "processing" | "ready";

export type LinkChatSession = {
  id: string;
  url: string;
  title: string;
  createdAt: number;
  status: LinkChatStatus;
  processingStartedAt?: number;
  messages: LinkChatMessage[];
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
  const parsed = safeParse<LinkChatSession[]>(window.localStorage.getItem(STORAGE_KEY));
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

export function makeJobId() {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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


