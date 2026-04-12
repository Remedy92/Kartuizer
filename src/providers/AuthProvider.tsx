import { useEffect, type ReactNode } from 'react'
import { authClient } from '@/lib/auth-client'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/stores'
import { queryClient } from '@/lib/queryClient'
import type { UserProfile } from '@/types'
import type { AppSession } from '@/types/auth'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setSession, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    let isMounted = true

    const sync = async () => {
      const sessionState = await authClient.getSession().catch(() => null)
      const session = (sessionState?.data ?? null) as AppSession | null

      if (!isMounted) return

      setSession(session)

      if (!session) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const payload = await apiFetch<{ session: AppSession; profile: UserProfile | null }>('/api/me')
        if (!isMounted) return
        setSession(payload.session)
        setUser(payload.profile)
      } catch {
        if (!isMounted) return
        setSession(null)
        setUser(null)
        queryClient.clear()
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void sync()

    return () => {
      isMounted = false
    }
  }, [setSession, setUser, setLoading])

  return <>{children}</>
}
