import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { UserProfile } from '@/types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: UserProfile | null
  isAdmin: boolean
  isLoading: boolean

  setSession: (session: Session | null) => void
  setUser: (user: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAdmin: false,
  isLoading: true,

  setSession: (session) => set({ session }),

  setUser: (user) =>
    set({
      user,
      isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    }),

  setLoading: (isLoading) => set({ isLoading }),

  signOut: async () => {
    // Clear local session immediately so UI can recover even if network is stuck.
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Ignore local sign-out errors (stale tokens).
    }

    set({ session: null, user: null, isAdmin: false })

    // Attempt to revoke server-side session without blocking the UI.
    supabase.auth.signOut({ scope: 'global' }).catch(() => {})
  },
}))
