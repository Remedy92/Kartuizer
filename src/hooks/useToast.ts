import { useUIStore, type Toast } from '@/stores'

export function useToast() {
  const addToast = useUIStore((s) => s.addToast)
  const removeToast = useUIStore((s) => s.removeToast)
  const toasts = useUIStore((s) => s.toasts)

  function toast(options: Omit<Toast, 'id'>) {
    addToast(options)
  }

  function success(title: string, message?: string) {
    addToast({ type: 'success', title, message })
  }

  function error(title: string, message?: string) {
    addToast({ type: 'error', title, message })
  }

  function info(title: string, message?: string) {
    addToast({ type: 'info', title, message })
  }

  function warning(title: string, message?: string) {
    addToast({ type: 'warning', title, message })
  }

  return {
    toasts,
    toast,
    success,
    error,
    info,
    warning,
    dismiss: removeToast,
  }
}
