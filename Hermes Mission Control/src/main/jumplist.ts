import { app } from 'electron'
import { join } from 'path'

interface RecentSession {
  id: string
  title: string
}

/**
 * Sets up the Windows Taskbar Jump List with static tasks and dynamic recent chat sessions.
 * Called on startup and whenever sessions change.
 */
export function setupJumpList(recentSessions: RecentSession[] = []): void {
  if (process.platform !== 'win32') return

  const execPath = process.execPath
  const iconPath = join(__dirname, '../../resources/icon.ico')

  try {
    app.setJumpList([
      // Recent chat sessions (dynamic)
      ...(recentSessions.length > 0
        ? [
            {
              type: 'custom' as const,
              name: 'Recent Chats',
              items: recentSessions.slice(0, 5).map(session => ({
                type: 'task' as const,
                title: session.title,
                description: `Open chat: ${session.title}`,
                program: execPath,
                args: `--deeplink hermes://session/${session.id}`,
                iconPath,
                iconIndex: 0
              }))
            }
          ]
        : []),

      // Static tasks
      {
        type: 'tasks' as const,
        items: [
          {
            type: 'task' as const,
            title: 'New Chat',
            description: 'Start a new conversation with Hermes',
            program: execPath,
            args: '--deeplink hermes://chat/new',
            iconPath,
            iconIndex: 0
          },
          {
            type: 'task' as const,
            title: 'Open Dashboard',
            description: 'Go to Mission Control dashboard',
            program: execPath,
            args: '--deeplink hermes://dashboard',
            iconPath,
            iconIndex: 0
          },
          {
            type: 'task' as const,
            title: 'Open Terminal',
            description: 'Open Hermes terminal',
            program: execPath,
            args: '--deeplink hermes://terminal',
            iconPath,
            iconIndex: 0
          }
        ]
      }
    ])
  } catch (e) {
    // Jump list can fail if not on Windows or in dev mode
    console.warn('Jump list setup failed:', e)
  }
}
