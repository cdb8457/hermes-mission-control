import { useChatStore } from '../store/chat'

type ExportFormat = 'markdown' | 'json' | 'text'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function exportAsMarkdown(sessionId: string): string {
  const { sessions, messages } = useChatStore.getState()
  const session = sessions.find(s => s.id === sessionId)
  const msgs = messages[sessionId] ?? []

  const lines: string[] = []
  lines.push(`# ${session?.title ?? 'Chat Export'}`)
  lines.push(``)
  lines.push(`*Exported from Hermes Mission Control · ${new Date().toLocaleString()}*`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  for (const msg of msgs) {
    if (msg.isStreaming) continue
    const role = msg.role === 'user' ? '**You**' : '**Hermes**'
    const time = msg.createdAt ? formatDate(msg.createdAt) : ''
    lines.push(`### ${role}${time ? `  ·  *${time}*` : ''}`)
    lines.push(``)

    // Tool calls
    if ((msg.toolCalls ?? []).length > 0) {
      for (const tc of msg.toolCalls ?? []) {
        lines.push(`> 🔧 **Tool:** \`${tc.name}\``)
        lines.push(`>`)
        lines.push(`> **Input:**`)
        lines.push(`> \`\`\`json`)
        lines.push(`> ${JSON.stringify(tc.input, null, 2).replace(/\n/g, '\n> ')}`)
        lines.push(`> \`\`\``)
        if (tc.output) {
          lines.push(`>`)
          lines.push(`> **Output:** ${tc.output}`)
        }
        lines.push(``)
      }
    }

    lines.push(msg.content)
    lines.push(``)
    lines.push(`---`)
    lines.push(``)
  }

  return lines.join('\n')
}

function exportAsJson(sessionId: string): string {
  const { sessions, messages } = useChatStore.getState()
  const session = sessions.find(s => s.id === sessionId)
  const msgs = messages[sessionId] ?? []

  return JSON.stringify(
    {
      session: {
        id: session?.id,
        title: session?.title,
        messageCount: session?.messageCount,
        createdAt: session?.createdAt
      },
      exportedAt: new Date().toISOString(),
      messages: msgs
        .filter(m => !m.isStreaming)
        .map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          model: m.model,
          toolCalls: m.toolCalls,
          createdAt: m.createdAt
        }))
    },
    null,
    2
  )
}

function exportAsText(sessionId: string): string {
  const { sessions, messages } = useChatStore.getState()
  const session = sessions.find(s => s.id === sessionId)
  const msgs = messages[sessionId] ?? []

  const lines: string[] = []
  lines.push(`${session?.title ?? 'Chat Export'}`)
  lines.push(`Exported: ${new Date().toLocaleString()}`)
  lines.push(`${'─'.repeat(60)}`)
  lines.push(``)

  for (const msg of msgs) {
    if (msg.isStreaming) continue
    const role = msg.role === 'user' ? 'You' : 'Hermes'
    lines.push(`[${role}] ${msg.createdAt ? formatDate(msg.createdAt) : ''}`)
    lines.push(msg.content)
    lines.push(``)
  }

  return lines.join('\n')
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function useChatExport() {
  const exportChat = (sessionId: string, format: ExportFormat): void => {
    const { sessions } = useChatStore.getState()
    const session = sessions.find(s => s.id === sessionId)
    const safeName = (session?.title ?? 'chat').replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40)
    const ts = new Date().toISOString().slice(0, 10)

    switch (format) {
      case 'markdown': {
        const content = exportAsMarkdown(sessionId)
        downloadFile(content, `hermes-${safeName}-${ts}.md`, 'text/markdown')
        break
      }
      case 'json': {
        const content = exportAsJson(sessionId)
        downloadFile(content, `hermes-${safeName}-${ts}.json`, 'application/json')
        break
      }
      case 'text': {
        const content = exportAsText(sessionId)
        downloadFile(content, `hermes-${safeName}-${ts}.txt`, 'text/plain')
        break
      }
    }
  }

  return { exportChat }
}
