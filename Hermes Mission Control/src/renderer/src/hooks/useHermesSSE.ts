import { useRef, useCallback } from 'react'
import { useChatStore } from '../store/chat'
import { useConnectionStore } from '../store/connection'
import { useOfflineQueue } from '../store/offline'
import { streamChatCompletion } from '../api/chat'

interface SendMessageOptions {
  sessionId: string
  content: string
  model: string
  onDone?: () => void
}

export function useHermesSSE() {
  const controllerRef = useRef<AbortController | null>(null)
  const chatStore = useChatStore()

  const sendMessage = useCallback(
    async ({ sessionId, content, model, onDone }: SendMessageOptions) => {
      const status = useConnectionStore.getState().status

      // ── Offline: queue the message instead of sending ─────────────────────
      if (status !== 'connected') {
        const { enqueue } = useOfflineQueue.getState()
        enqueue(sessionId, content, model)
        // Still add user message to the chat so user can see it was accepted
        chatStore.addMessage(sessionId, {
          role: 'user',
          content: `${content}\n\n*[Queued — will send when reconnected]*`,
          isStreaming: false
        })
        onDone?.()
        return
      }

      // ── Online: normal streaming flow ─────────────────────────────────────

      // Add user message
      chatStore.addMessage(sessionId, {
        role: 'user',
        content,
        isStreaming: false
      })

      // Add placeholder assistant message
      const assistantMsg = chatStore.addMessage(sessionId, {
        role: 'assistant',
        content: '',
        isStreaming: true,
        toolCalls: [],
        model
      })

      // Create abort controller
      const controller = new AbortController()
      controllerRef.current = controller
      chatStore.setStreaming(true, controller)

      // Build message history for API
      const messages = chatStore.getActiveMessages()
      const apiMessages = messages
        .filter((m) => !m.isStreaming || m.id !== assistantMsg.id)
        .map((m) => ({ role: m.role, content: m.content }))

      // Tool call accumulator
      const toolCallAccumulator: Record<string, { name: string; input: string }> = {}

      try {
        for await (const chunk of streamChatCompletion(
          {
            model,
            messages: apiMessages,
            stream: true,
            session_id: sessionId
          },
          controller.signal
        )) {
          if (chunk.done) break

          if (chunk.error) {
            chatStore.updateMessage(sessionId, assistantMsg.id, {
              content: `Error: ${chunk.error}`,
              isStreaming: false
            })
            break
          }

          if (chunk.content) {
            chatStore.appendToMessage(sessionId, assistantMsg.id, chunk.content)
          }

          if (chunk.toolCall) {
            const tc = chunk.toolCall
            if (!toolCallAccumulator[tc.id]) {
              toolCallAccumulator[tc.id] = { name: tc.name, input: '' }
            }
            if (tc.name) toolCallAccumulator[tc.id].name = tc.name
            toolCallAccumulator[tc.id].input += tc.input

            // Update tool calls in message
            const toolCalls = Object.entries(toolCallAccumulator).map(([id, data]) => ({
              id,
              name: data.name,
              input: (() => {
                try {
                  return JSON.parse(data.input)
                } catch {
                  return {}
                }
              })(),
              output: undefined,
              isExpanded: false
            }))

            chatStore.updateMessage(sessionId, assistantMsg.id, { toolCalls })
          }
        }
      } finally {
        chatStore.updateMessage(sessionId, assistantMsg.id, { isStreaming: false })
        chatStore.setStreaming(false, null)
        controllerRef.current = null
        onDone?.()
      }
    },
    []
  )

  const stop = useCallback(() => {
    controllerRef.current?.abort()
    chatStore.stopStreaming()
  }, [])

  return { sendMessage, stop }
}
