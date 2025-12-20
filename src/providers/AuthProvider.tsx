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
      .then(({ data: { session } }) => {
        setSession(session)
        if (session?.user) {
          fetchUserProfile(session.user.id)
        } else {
          setLoading(false)
        }
      })
      .catch(() => {
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)

      // Handle password recovery - session is auto-created by Supabase from URL tokens
      if (event === 'PASSWORD_RECOVERY') {
        setLoading(false)
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserProfile(session.user.id)
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        queryClient.clear()
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
