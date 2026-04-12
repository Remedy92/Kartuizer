import { create } from 'zustand'
import type { UserProfile } from '@/types'
import type { AppSession } from '@/types/auth'
import { authClient } from '@/lib/auth-client'

interface AuthState {
  session: AppSession | null
  user: UserProfile | null
  isAdmin: boolean
  isPending: boolean
  isLoading: boolean

  setSession: (session: AppSession | null) => void
  setUser: (user: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAdmin: false,
  isPending: false,
  isLoading: true,

  setSession: (session) => set({ session }),

  setUser: (user) =>
    set({
      user,
      isAdmin: user?.role === 'admin',
      isPending: user?.approval_status === 'pending',
    }),

  setLoading: (isLoading) => set({ isLoading }),

  signOut: async () => {
    await authClient.signOut().catch(() => undefined)
    set({ session: null, user: null, isAdmin: false, isPending: false })
  },
}))
