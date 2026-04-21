import { create } from 'zustand'
import { generateId as nanoid } from '../lib/utils'

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  output?: string
  isExpanded: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: ToolCall[]
  createdAt: Date
  isStreaming?: boolean
  model?: string
  tokens?: number
}

export interface ChatSession {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
  model?: string
  forkedFrom?: { sessionId: string; messageId: string }
}

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  messages: Record<string, Message[]>
  isStreaming: boolean
  streamController: AbortController | null

  // Actions
  createSession: (title?: string) => string
  setActiveSession: (id: string | null) => void
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'createdAt'>) => Message
  updateMessage: (sessionId: string, messageId: string, update: Partial<Message>) => void
  appendToMessage: (sessionId: string, messageId: string, content: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, title: string) => void
  setSessions: (sessions: ChatSession[]) => void
  setStreaming: (isStreaming: boolean, controller?: AbortController | null) => void
  stopStreaming: () => void
  getActiveMessages: () => Message[]
  toggleToolCall: (sessionId: string, messageId: string, toolCallId: string) => void
  forkSession: (sessionId: string, messageId: string) => string
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: {},
  isStreaming: false,
  streamController: null,

  createSession: (title = 'New Chat') => {
    const id = nanoid()
    const now = new Date()
    const session: ChatSession = {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      messageCount: 0
    }
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: id,
      messages: { ...state.messages, [id]: [] }
    }))
    return id
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  addMessage: (sessionId, messageData) => {
    const message: Message = {
      ...messageData,
      id: nanoid(),
      createdAt: new Date()
    }
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] ?? []), message]
      },
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, updatedAt: new Date(), messageCount: (s.messageCount || 0) + 1 }
          : s
      )
    }))
    return message
  },

  updateMessage: (sessionId, messageId, update) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: (state.messages[sessionId] ?? []).map((m) =>
          m.id === messageId ? { ...m, ...update } : m
        )
      }
    }))
  },

  appendToMessage: (sessionId, messageId, content) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: (state.messages[sessionId] ?? []).map((m) =>
          m.id === messageId ? { ...m, content: m.content + content } : m
        )
      }
    }))
  },

  deleteSession: (id) => {
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id)
      const messages = { ...state.messages }
      delete messages[id]
      return {
        sessions,
        messages,
        activeSessionId: state.activeSessionId === id
          ? (sessions[0]?.id ?? null)
          : state.activeSessionId
      }
    })
  },

  renameSession: (id, title) => {
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, title } : s))
    }))
  },

  setSessions: (sessions) => set({ sessions }),

  setStreaming: (isStreaming, controller) =>
    set({ isStreaming, streamController: controller ?? null }),

  stopStreaming: () => {
    const { streamController } = get()
    streamController?.abort()
    set({ isStreaming: false, streamController: null })

    // Mark any streaming messages as done
    const { activeSessionId, messages } = get()
    if (!activeSessionId) return
    const sessionMessages = messages[activeSessionId] ?? []
    const streamingMsg = sessionMessages.find((m) => m.isStreaming)
    if (streamingMsg) {
      get().updateMessage(activeSessionId, streamingMsg.id, { isStreaming: false })
    }
  },

  getActiveMessages: () => {
    const { activeSessionId, messages } = get()
    if (!activeSessionId) return []
    return messages[activeSessionId] ?? []
  },

  toggleToolCall: (sessionId, messageId, toolCallId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: (state.messages[sessionId] ?? []).map((m) =>
          m.id === messageId
            ? {
                ...m,
                toolCalls: m.toolCalls?.map((tc) =>
                  tc.id === toolCallId ? { ...tc, isExpanded: !tc.isExpanded } : tc
                )
              }
            : m
        )
      }
    }))
  },

  forkSession: (sessionId, messageId) => {
    const state = get()
    const originalMessages = state.messages[sessionId] ?? []
    const forkIndex = originalMessages.findIndex((m) => m.id === messageId)
    const slicedMessages = forkIndex === -1
      ? [...originalMessages]
      : originalMessages.slice(0, forkIndex + 1)

    const originalSession = state.sessions.find((s) => s.id === sessionId)
    const branchTitle = `↳ ${originalSession?.title ?? 'Chat'}`

    const newId = nanoid()
    const now = new Date()
    const forkedSession: ChatSession = {
      id: newId,
      title: branchTitle,
      createdAt: now,
      updatedAt: now,
      messageCount: slicedMessages.length,
      forkedFrom: { sessionId, messageId }
    }

    // Deep-copy messages with fresh ids so they're independent
    const copiedMessages: Message[] = slicedMessages.map((m) => ({ ...m, id: nanoid() }))

    set((state) => {
      const idx = state.sessions.findIndex((s) => s.id === sessionId)
      const sessions = [...state.sessions]
      sessions.splice(idx + 1, 0, forkedSession)
      return {
        sessions,
        activeSessionId: newId,
        messages: { ...state.messages, [newId]: copiedMessages }
      }
    })
    return newId
  }
}))
