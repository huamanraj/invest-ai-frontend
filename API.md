# Invest AI - API Documentation

**Base URL:** `http://localhost:3001`

---

## Overview

Invest AI v2.0 introduces a **Projects** concept. A Project contains:

- A scraped BSE India annual report (with embeddings)
- Multiple **Chats** that share the same embeddings

This means you only scrape once per project, and all chats within that project reuse the same data!

---

## Projects API

### Create Project

Creates a new project and starts processing the BSE India annual report.

```
POST /api/projects
```

**Request:**

```json
{
  "url": "https://www.bseindia.com/stock-share-price/mps-ltd/mpsltd/532440/financials-annual-reports/",
  "name": "MPS Analysis 2024" // Optional, defaults to company name
}
```

**Response:** `201 Created`

```json
{
  "projectId": "732f161e-59dc-4e30-b7a4-416f239ae5dc",
  "name": "MPS Analysis 2024",
  "companyName": "MPS LTD",
  "message": "Project created and processing started. Use the events endpoint to track progress."
}
```

---

### Get Project Status

```
GET /api/projects/:projectId
```

**Response:**

```json
{
  "id": "732f161e-59dc-4e30-b7a4-416f239ae5dc",
  "name": "MPS Analysis 2024",
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

### List All Projects

```
GET /api/projects
```

**Response:** Array of project objects

---

### SSE: Real-time Project Progress

```
GET /api/projects/:projectId/events
```

**Event Types:**

- `status` - Status change (scraping, downloading, parsing, embedding, completed, failed)
- `progress` - Progress update with message
- `error` - Error occurred
- `complete` - Processing finished

**Next.js Example:**

```typescript
const eventSource = new EventSource(
  `http://localhost:3001/api/projects/${projectId}/events`
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

## Chats API (within Projects)

### Create Chat

Create a new chat within a project.

```
POST /api/projects/:projectId/chats
```

**Request:**

```json
{
  "title": "Q1 Analysis" // Optional, defaults to "New Chat"
}
```

**Response:** `201 Created`

```json
{
  "chatId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Q1 Analysis"
}
```

---

### List Chats

Get all chats for a project.

```
GET /api/projects/:projectId/chats
```

**Response:**

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Q1 Analysis",
    "created_at": "2026-01-06T03:30:00.000Z",
    "updated_at": "2026-01-06T03:35:00.000Z"
  }
]
```

---

### Get Chat Messages

```
GET /api/projects/:projectId/chats/:chatId
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

### Update Chat Title

```
PATCH /api/projects/:projectId/chats/:chatId
```

**Request:**

```json
{
  "title": "Revenue Analysis Q1"
}
```

**Response:**

```json
{
  "success": true,
  "title": "Revenue Analysis Q1"
}
```

---

### Send Message (Streaming)

Send a message to a chat and receive a streaming response.

```
POST /api/projects/:projectId/chats/:chatId/messages
```

**Request:**

```json
{
  "message": "What was the total revenue?"
}
```

**Response:** SSE stream

**Events:**

- `data` - Chunk of response text: `{"chunk": "The total..."}`
- `done` - Final response with sources

**Next.js Example:**

```typescript
async function sendMessage(projectId: string, chatId: string, message: string) {
  const res = await fetch(
    `http://localhost:3001/api/projects/${projectId}/chats/${chatId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }
  );

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

## Quick Start (Next.js)

```typescript
// lib/investai.ts
const API_URL = "http://localhost:3001";

// ===== PROJECTS =====

export async function createProject(bseUrl: string, name?: string) {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: bseUrl, name }),
  });
  return res.json();
}

export async function getProjectStatus(projectId: string) {
  const res = await fetch(`${API_URL}/api/projects/${projectId}`);
  return res.json();
}

export function subscribeToProject(
  projectId: string,
  callbacks: {
    onStatus?: (status: string, message: string) => void;
    onProgress?: (message: string) => void;
    onComplete?: (data: any) => void;
    onError?: (error: string) => void;
  }
) {
  const es = new EventSource(`${API_URL}/api/projects/${projectId}/events`);

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

// ===== CHATS =====

export async function createChat(projectId: string, title?: string) {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return res.json();
}

export async function getChats(projectId: string) {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/chats`);
  return res.json();
}

export async function getChatMessages(projectId: string, chatId: string) {
  const res = await fetch(
    `${API_URL}/api/projects/${projectId}/chats/${chatId}`
  );
  return res.json();
}

export async function* streamChatMessage(
  projectId: string,
  chatId: string,
  message: string
) {
  const res = await fetch(
    `${API_URL}/api/projects/${projectId}/chats/${chatId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }
  );

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

## UI Flow Example

```
1. User enters BSE URL
   └── POST /api/projects { url, name }
   └── Returns projectId

2. Show progress while processing
   └── GET /api/projects/:projectId/events (SSE)
   └── When "completed" → Enable chat

3. User clicks "New Chat"
   └── POST /api/projects/:projectId/chats
   └── Returns chatId

4. User sends message
   └── POST /api/projects/:projectId/chats/:chatId/messages
   └── Stream response to UI

5. User creates another chat (same project embeddings!)
   └── POST /api/projects/:projectId/chats
   └── No re-scraping needed! 🎉
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
| 404    | Project/chat not found                    |
| 500    | Server error                              |

---

## Legacy Jobs API (Deprecated)

> ⚠️ **Deprecated**: Use the Projects API above instead. The Jobs API is kept for backward compatibility.

### Create Job

```
POST /api/jobs
```

### Get Job Status

```
GET /api/jobs/:jobId
```

### Send Chat Message

```
POST /api/chat/:jobId
```

See the original documentation for these endpoints if needed.
