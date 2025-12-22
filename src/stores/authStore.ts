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
      isAdmin: user?.role === 'admin',
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
    supabase.auth.signOut({ scope: 'global' }).catch(() => { })

    // If storage somehow got corrupted, aggressively remove Supabase auth tokens so the app
    // doesn't require a full "Clear Site Data" in the browser to recover.
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = []
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i)
          if (!key) continue
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => window.localStorage.removeItem(key))
      }
    } catch {
      // Best-effort only.
    }
  },
}))
