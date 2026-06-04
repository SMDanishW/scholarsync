import type { Conversation, ConversationDetail, Paper } from "./types"

// Empty string → relative URLs → Next.js rewrites proxy /api/* to localhost:8000.
// Set NEXT_PUBLIC_API_URL only if you need to point at a remote backend directly.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    let message = res.statusText
    try {
      const err = await res.json()
      message = err.detail ?? err.message ?? message
    } catch {}
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export const api = {
  conversations: {
    create: () =>
      request<Conversation>("/api/conversations", { method: "POST" }),
    list: () =>
      request<Conversation[]>("/api/conversations"),
    get: (id: string) =>
      request<ConversationDetail>(`/api/conversations/${id}`),
    delete: (id: string) =>
      fetch(`${BASE}/api/conversations/${id}`, { method: "DELETE" }),
  },

  papers: {
    upload: (conversationId: string, file: File) => {
      const form = new FormData()
      form.append("file", file)
      return request<Paper>(`/api/conversations/${conversationId}/upload`, {
        method: "POST",
        body: form,
      })
    },
    delete: (conversationId: string, paperId: string) =>
      fetch(`${BASE}/api/conversations/${conversationId}/papers/${paperId}`, {
        method: "DELETE",
      }),
  },

  chat: {
    send: (conversationId: string, message: string) =>
      fetch(`${BASE}/api/conversations/${conversationId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }),
  },
}
