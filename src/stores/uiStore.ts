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

  // Sidebar (for AdminLayout collapsible section)
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Mobile menu overlay
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  toggleMobileMenu: () => void

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

  // Sidebar (for AdminLayout collapsible section)
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Mobile menu overlay
  mobileMenuOpen: false,
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

  // Modals
  activeModal: null,
  modalData: {},

  openModal: (activeModal, data = {}) => set({ activeModal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: {} }),
}))
