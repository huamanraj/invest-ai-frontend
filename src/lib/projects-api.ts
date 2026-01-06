// Invest AI Projects API Client
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Types matching API responses
export type ProjectStatus =
  | "pending"
  | "scraping"
  | "downloading"
  | "parsing"
  | "embedding"
  | "completed"
  | "failed";

export type Project = {
  id: string;
  name: string;
  url: string;
  company_name: string;
  status: ProjectStatus;
  error_message: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  isProcessing: boolean;
};

export type CreateProjectResponse = {
  projectId: string;
  name: string;
  companyName: string;
  message: string;
};

export type Chat = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type CreateChatResponse = {
  chatId: string;
  title: string;
};

// ============ Projects API ============

export async function createProject(
  bseUrl: string,
  name?: string
): Promise<CreateProjectResponse> {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: bseUrl, name }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create project" }));
    throw new Error(error.error || "Failed to create project");
  }

  return res.json();
}

export async function getProject(projectId: string): Promise<Project> {
  const res = await fetch(`${API_URL}/api/projects/${projectId}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to get project" }));
    throw new Error(error.error || "Failed to get project");
  }

  return res.json();
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/api/projects`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to list projects" }));
    throw new Error(error.error || "Failed to list projects");
  }

  return res.json();
}

// ============ Project Events SSE ============

export type ProjectEventCallbacks = {
  onStatus?: (status: ProjectStatus, message: string) => void;
  onProgress?: (message: string) => void;
  onComplete?: (data: { chunksProcessed: number }) => void;
  onError?: (error: string) => void;
};

export function subscribeToProjectEvents(
  projectId: string,
  callbacks: ProjectEventCallbacks
): () => void {
  const eventSource = new EventSource(`${API_URL}/api/projects/${projectId}/events`);

  eventSource.addEventListener("status", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onStatus?.(data.status, data.message);
    } catch (err) {
      console.error("Failed to parse status event:", err);
    }
  });

  eventSource.addEventListener("progress", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onProgress?.(data.message);
    } catch (err) {
      console.error("Failed to parse progress event:", err);
    }
  });

  eventSource.addEventListener("complete", (e) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onComplete?.(data);
      eventSource.close();
    } catch (err) {
      console.error("Failed to parse complete event:", err);
    }
  });

  eventSource.addEventListener("error", (e) => {
    try {
      const messageEvent = e as MessageEvent;
      if (messageEvent.data) {
        const data = JSON.parse(messageEvent.data);
        callbacks.onError?.(data.error);
      } else {
        callbacks.onError?.("Connection error");
      }
      eventSource.close();
    } catch (err) {
      callbacks.onError?.("Connection error");
      eventSource.close();
    }
  });

  return () => eventSource.close();
}

// ============ Chats API ============

export async function createChat(
  projectId: string,
  title?: string
): Promise<CreateChatResponse> {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create chat" }));
    throw new Error(error.error || "Failed to create chat");
  }

  return res.json();
}

export async function getChats(projectId: string): Promise<Chat[]> {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/chats`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to get chats" }));
    throw new Error(error.error || "Failed to get chats");
  }

  return res.json();
}

export async function getChatMessages(
  projectId: string,
  chatId: string
): Promise<ChatMessage[]> {
  const res = await fetch(
    `${API_URL}/api/projects/${projectId}/chats/${chatId}`
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to get messages" }));
    throw new Error(error.error || "Failed to get messages");
  }

  return res.json();
}

export async function updateChatTitle(
  projectId: string,
  chatId: string,
  title: string
): Promise<{ success: boolean; title: string }> {
  const res = await fetch(
    `${API_URL}/api/projects/${projectId}/chats/${chatId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to update chat title" }));
    throw new Error(error.error || "Failed to update chat title");
  }

  return res.json();
}

// ============ Chat Messages API ============

export type StreamChatCallbacks = {
  onChunk?: (text: string) => void;
  onDone?: (data: { response: string; sources?: unknown[] }) => void;
  onError?: (error: string) => void;
};

export async function streamChatMessage(
  projectId: string,
  chatId: string,
  message: string,
  callbacks?: StreamChatCallbacks
): Promise<{ response: string }> {
  const res = await fetch(
    `${API_URL}/api/projects/${projectId}/chats/${chatId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to send message" }));
    throw new Error(error.error || "Failed to send message");
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";

  if (!reader) {
    throw new Error("No response body");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              fullResponse += data.chunk;
              callbacks?.onChunk?.(data.chunk);
            }
            if (data.response) {
              callbacks?.onDone?.(data);
            }
          } catch {
            // Ignore malformed JSON lines
          }
        }
        if (line.startsWith("event: done")) {
          // Handle done event
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { response: fullResponse };
}

