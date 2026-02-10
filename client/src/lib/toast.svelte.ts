type Toast = {
  id: string
  type: 'success' | 'error'
  message: string
}

function createToastStore() {
  let toasts = $state<Toast[]>([])

  return {
    get items() {
      return toasts
    },
    add(type: Toast['type'], message: string, duration = 3000) {
      const id = crypto.randomUUID()
      toasts = [...toasts, { id, type, message }]
      setTimeout(() => this.dismiss(id), duration)
    },
    dismiss(id: string) {
      toasts = toasts.filter((t) => t.id !== id)
    },
  }
}

export const toastStore = createToastStore()

export function toast(type: Toast['type'], message: string, duration = 3000) {
  toastStore.add(type, message, duration)
}

export function dismiss(id: string) {
  toastStore.dismiss(id)
}
