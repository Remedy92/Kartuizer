import { useEffect, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { queryClient } from './QueryProvider'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setSession, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        setSession(session)

        if (!session?.user) {
          setLoading(false)
          return
        }

        // Guard against "stuck" sessions (invalid/expired refresh token) that keep the UI
        // authenticated but break every request until users clear site data.
        const { error: userError } = await supabase.auth.getUser()
        if (userError) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
          setSession(null)
          setUser(null)
          queryClient.clear()
          setLoading(false)
          return
        }

        fetchUserProfile(session.user.id)
      })
      .catch(() => {
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)

      // Avoid deadlocks: do not run async Supabase calls inside onAuthStateChange.
      // Dispatch follow-up work after the callback returns. (Supabase docs + troubleshooting)
      const defer = (fn: () => void) => {
        if (typeof queueMicrotask === 'function') {
          queueMicrotask(fn)
        } else {
          setTimeout(fn, 0)
        }
      }

      if (event === 'PASSWORD_RECOVERY') {
        setLoading(false)
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        defer(() => {
          fetchUserProfile(session.user.id).catch(() => {
            setLoading(false)
          })
        })
        return
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        queryClient.clear()
        setLoading(false)
        return
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setUser, setLoading])

  async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // If no profile exists yet, create a default one
      if (error.code === 'PGRST116') {
        const session = useAuthStore.getState().session
        if (session?.user.email) {
          const { data: newProfile } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              email: session.user.email,
              role: 'member',
            })
            .select()
            .single()

          if (newProfile) {
            setUser(newProfile)
          }
        }
      }
    } else {
      setUser(data)
    }
    setLoading(false)
  }

  return <>{children}</>
}
