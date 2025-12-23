import { create } from 'zustand'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
}

interface UIState {
  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Modals
  activeModal: string | null
  modalData: Record<string, unknown>
  openModal: (modalId: string, data?: Record<string, unknown>) => void
  closeModal: () => void
}

let toastId = 0

export const useUIStore = create<UIState>((set, get) => ({
  // Toasts
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastId}`
    const duration = toast.duration ?? 5000

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Modals
  activeModal: null,
  modalData: {},

  openModal: (activeModal, data = {}) => set({ activeModal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: {} }),
}))
