import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

export interface ConfirmState {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

interface ToastStore {
  toasts: Toast[]
  confirm: ConfirmState | null

  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  showConfirm: (opts: Omit<ConfirmState, 'isOpen' | 'onCancel'> & { onCancel?: () => void }) => Promise<boolean>
  closeConfirm: () => void
}

let confirmResolve: ((val: boolean) => void) | null = null

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  confirm: null,

  addToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const duration = toast.duration ?? 4000
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }))

    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration)
    }
  },

  removeToast: (id) => {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },

  showConfirm: (opts) => {
    return new Promise<boolean>((resolve) => {
      confirmResolve = resolve
      set({
        confirm: {
          isOpen: true,
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel || 'Confirm',
          cancelLabel: opts.cancelLabel || 'Cancel',
          variant: opts.variant || 'default',
          onConfirm: async () => {
            try {
              if (opts.onConfirm) await opts.onConfirm()
              resolve(true)
              confirmResolve = null
              set({ confirm: null })
            } catch (err: any) {
              // If onConfirm fails, we don't resolve yet or we resolve false?
              // Actually, we stay open so the user can see if we show a toast
              // But for now, let's just allow it to be caught by the caller
              console.error('onConfirm failed:', err)
            }
          },
          onCancel: () => {
            resolve(false)
            confirmResolve = null
            set({ confirm: null })
            opts.onCancel?.()
          }
        }
      })
    })
  },

  closeConfirm: () => {
    if (confirmResolve) {
      confirmResolve(false)
      confirmResolve = null
    }
    set({ confirm: null })
  }
}))

// Convenience helpers
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, message, duration: 6000 }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, message }),
}

export const confirm = useToastStore.getState().showConfirm
