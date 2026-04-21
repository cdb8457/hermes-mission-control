import { useCallback } from 'react'
import { useSettingsStore } from '../store/settings'
import { toast } from './useToast'

interface NotifyOptions {
  title: string
  body: string
  type?: 'jobComplete' | 'agentMessage' | 'connectionChange'
  native?: boolean
}

export function useNotifications() {
  const { notifications } = useSettingsStore()

  const notify = useCallback(({ title, body, type, native }: NotifyOptions) => {
    // Check if this notification type is enabled
    if (type && !notifications[type]) return

    // In-app toast always
    toast({ title, description: body })

    // Native Windows notification
    if (native !== false && window.electronAPI) {
      window.electronAPI.notification.show(title, body)
    }
  }, [notifications])

  return { notify }
}
