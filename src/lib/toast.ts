export type ToastVariant = 'default' | 'loading' | 'success' | 'error'

export type Toast = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

type ToastListener = (toasts: Toast[]) => void

let toasts: Toast[] = []
const listeners = new Set<ToastListener>()

function notify(): void {
  const snapshot = [...toasts]
  for (const listener of listeners) {
    listener(snapshot)
  }
}

export function subscribeToToasts(listener: ToastListener): () => void {
  listeners.add(listener)
  listener([...toasts])
  return () => listeners.delete(listener)
}

export function showToast(toast: {
  id?: string
  title: string
  description?: string
  variant?: ToastVariant
}): string {
  const id = toast.id ?? crypto.randomUUID()
  toasts = [
    ...toasts,
    {
      id,
      title: toast.title,
      description: toast.description,
      variant: toast.variant ?? 'default',
    },
  ]
  notify()
  return id
}

export function updateToast(id: string, patch: Partial<Omit<Toast, 'id'>>): void {
  toasts = toasts.map((toast) => (toast.id === id ? { ...toast, ...patch } : toast))
  notify()
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((toast) => toast.id !== id)
  notify()
}
