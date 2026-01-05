# Invest AI - API Documentation

**Base URL:** `http://localhost:3001`

---

## Jobs API

### Create Job

Starts processing a BSE India annual report.

```
POST /api/jobs
```

**Request:**

```json
{
  "url": "https://www.bseindia.com/stock-share-price/mps-ltd/mpsltd/532440/financials-annual-reports/"
}
```

**Response:** `201 Created`

```json
{
  "jobId": "732f161e-59dc-4e30-b7a4-416f239ae5dc",
  "companyName": "MPS LTD",
  "message": "Job created and processing started..."
}
```

---

### Get Job Status

```
GET /api/jobs/:jobId
```

**Response:**

```json
{
  "id": "732f161e-59dc-4e30-b7a4-416f239ae5dc",
  "url": "https://www.bseindia.com/...",
  "company_name": "MPS LTD",
  "status": "completed", // pending | scraping | downloading | parsing | embedding | completed | failed
  "error_message": null,
  "pdf_url": "https://www.bseindia.com/...",
  "created_at": "2026-01-06T03:30:00.000Z",
  "updated_at": "2026-01-06T03:35:00.000Z",
  "isProcessing": false
}
```

---

### List All Jobs

```
GET /api/jobs
```

**Response:** Array of job objects

---

### SSE: Real-time Job Progress

```
GET /api/jobs/:jobId/events
```

**Event Types:**

- `status` - Status change (scraping, downloading, parsing, embedding, completed, failed)
- `progress` - Progress update with message
- `error` - Error occurred
- `complete` - Job finished

**Next.js Example:**

```typescript
const eventSource = new EventSource(
  `http://localhost:3001/api/jobs/${jobId}/events`
);

eventSource.addEventListener("status", (e) => {
  const data = JSON.parse(e.data);
  console.log("Status:", data.status, data.message);
});

eventSource.addEventListener("progress", (e) => {
  const data = JSON.parse(e.data);
  console.log("Progress:", data.message);
});

eventSource.addEventListener("complete", (e) => {
  const data = JSON.parse(e.data);
  console.log("Done! Chunks:", data.chunksProcessed);
  eventSource.close();
});

eventSource.addEventListener("error", (e) => {
  console.error("Error:", JSON.parse(e.data).error);
  eventSource.close();
});
```

---

## Chat API

### Send Message (Streaming)

```
POST /api/chat/:jobId
```

**Request:**

```json
{
  "message": "What was the total revenue?",
  "sessionId": "optional-uuid" // omit for new session
}
```

**Response:** SSE stream

**Events:**

- `data` - Chunk of response text: `{"chunk": "The total..."}`
- `done` - Final response with sources

**Next.js Example:**

```typescript
async function chat(jobId: string, message: string, sessionId?: string) {
  const res = await fetch(`http://localhost:3001/api/chat/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (data.chunk) {
          fullResponse += data.chunk;
          // Update UI with streaming text
        }
      }
      if (line.startsWith("event: done")) {
        // Next line has final data with sources
      }
    }
  }

  return fullResponse;
}
```

---

### Get Chat Sessions

```
GET /api/chat/:jobId/sessions
```

**Response:**

```json
[
  {
    "id": "session-uuid",
    "created_at": "2026-01-06T03:30:00.000Z",
    "updated_at": "2026-01-06T03:35:00.000Z"
  }
]
```

---

### Get Session Messages

```
GET /api/chat/:jobId/sessions/:sessionId
```

**Response:**

```json
[
  {
    "id": "msg-uuid",
    "role": "user",
    "content": "What was the revenue?",
    "created_at": "2026-01-06T03:30:00.000Z"
  },
  {
    "id": "msg-uuid",
    "role": "assistant",
    "content": "The total revenue was...",
    "created_at": "2026-01-06T03:30:05.000Z"
  }
]
```

---

## Quick Start (Next.js)

```typescript
// lib/investai.ts
const API_URL = "http://localhost:3001";

export async function createJob(bseUrl: string) {
  const res = await fetch(`${API_URL}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: bseUrl }),
  });
  return res.json();
}

export async function getJobStatus(jobId: string) {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}`);
  return res.json();
}

export function subscribeToJob(
  jobId: string,
  callbacks: {
    onStatus?: (status: string, message: string) => void;
    onProgress?: (message: string) => void;
    onComplete?: (data: any) => void;
    onError?: (error: string) => void;
  }
) {
  const es = new EventSource(`${API_URL}/api/jobs/${jobId}/events`);

  es.addEventListener("status", (e) => {
    const d = JSON.parse(e.data);
    callbacks.onStatus?.(d.status, d.message);
  });
  es.addEventListener("progress", (e) => {
    callbacks.onProgress?.(JSON.parse(e.data).message);
  });
  es.addEventListener("complete", (e) => {
    callbacks.onComplete?.(JSON.parse(e.data));
    es.close();
  });
  es.addEventListener("error", (e) => {
    callbacks.onError?.(JSON.parse(e.data).error);
    es.close();
  });

  return () => es.close();
}

export async function* streamChat(
  jobId: string,
  message: string,
  sessionId?: string
) {
  const res = await fetch(`${API_URL}/api/chat/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    for (const line of decoder.decode(value).split("\n")) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (data.chunk) yield { type: "chunk", text: data.chunk };
        if (data.response) yield { type: "done", ...data };
      }
    }
  }
}
```

---

## Error Responses

All errors return:

```json
{
  "error": "Error message here"
}
```

| Status | Meaning                                   |
| ------ | ----------------------------------------- |
| 400    | Bad request (invalid URL, missing fields) |
| 404    | Job/session not found                     |
| 500    | Server error                              |
