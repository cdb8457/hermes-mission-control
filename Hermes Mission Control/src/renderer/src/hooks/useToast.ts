import { create } from 'zustand'
import { generateId } from '../lib/utils'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  toast: (options: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],

  toast: (options) => {
    const id = generateId()
    const toast: Toast = { id, duration: 4000, ...options }

    set((state) => ({ toasts: [...state.toasts, toast] }))

    setTimeout(() => {
      get().dismiss(id)
    }, toast.duration)
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  }
}))

// Export convenience function
export const toast = (options: Omit<Toast, 'id'>): void => {
  useToast.getState().toast(options)
}
