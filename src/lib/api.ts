// Invest AI API Client
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Types matching API responses
export type JobStatus =
  | "pending"
  | "scraping"
  | "downloading"
  | "parsing"
  | "embedding"
  | "completed"
  | "failed";

export type Job = {
  id: string;
  url: string;
  company_name: string;
  status: JobStatus;
  error_message: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  isProcessing: boolean;
};

export type CreateJobResponse = {
  jobId: string;
  companyName: string;
  message: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type ChatSession = {
  id: string;
  created_at: string;
  updated_at: string;
};

// ============ Jobs API ============

export async function createJob(bseUrl: string): Promise<CreateJobResponse> {
  const res = await fetch(`${API_URL}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: bseUrl }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create job" }));
    throw new Error(error.error || "Failed to create job");
  }

  return res.json();
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to get job" }));
    throw new Error(error.error || "Failed to get job");
  }

  return res.json();
}

export async function listJobs(): Promise<Job[]> {
  const res = await fetch(`${API_URL}/api/jobs`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to list jobs" }));
    throw new Error(error.error || "Failed to list jobs");
  }

  return res.json();
}

// ============ Job Events SSE ============

export type JobEventCallbacks = {
  onStatus?: (status: JobStatus, message: string) => void;
  onProgress?: (message: string) => void;
  onComplete?: (data: { chunksProcessed: number }) => void;
  onError?: (error: string) => void;
};

export function subscribeToJobEvents(
  jobId: string,
  callbacks: JobEventCallbacks
): () => void {
  const eventSource = new EventSource(`${API_URL}/api/jobs/${jobId}/events`);

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
      // Check if this is an SSE error event with data
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

// ============ Chat API ============

export type StreamChatCallbacks = {
  onChunk?: (text: string) => void;
  onDone?: (data: { response: string; sources?: unknown[] }) => void;
  onError?: (error: string) => void;
};

export async function streamChat(
  jobId: string,
  message: string,
  sessionId?: string,
  callbacks?: StreamChatCallbacks
): Promise<{ response: string; sessionId?: string }> {
  const res = await fetch(`${API_URL}/api/chat/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to send message" }));
    throw new Error(error.error || "Failed to send message");
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";
  let resultSessionId = sessionId;

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
              if (data.sessionId) {
                resultSessionId = data.sessionId;
              }
            }
          } catch {
            // Ignore malformed JSON lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { response: fullResponse, sessionId: resultSessionId };
}

// ============ Chat Sessions API ============

export async function getChatSessions(jobId: string): Promise<ChatSession[]> {
  const res = await fetch(`${API_URL}/api/chat/${jobId}/sessions`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to get sessions" }));
    throw new Error(error.error || "Failed to get sessions");
  }

  return res.json();
}

export async function getSessionMessages(
  jobId: string,
  sessionId: string
): Promise<ChatMessage[]> {
  const res = await fetch(`${API_URL}/api/chat/${jobId}/sessions/${sessionId}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to get messages" }));
    throw new Error(error.error || "Failed to get messages");
  }

  return res.json();
}

