import { useEffect, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import type { UserRole } from '@/types'

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
          const bootstrapRole = getBootstrapRole(session.user.email)
          const { data: newProfile } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              email: session.user.email,
              role: bootstrapRole ?? 'member',
            })
            .select()
            .single()

          if (newProfile) {
            setUser(newProfile)
          }
        }
      }
    } else {
      const session = useAuthStore.getState().session
      const bootstrapRole = getBootstrapRole(session?.user.email)
      if (bootstrapRole && shouldUpgradeRole(data.role, bootstrapRole)) {
        const { data: updatedProfile } = await supabase
          .from('user_profiles')
          .update({
            role: bootstrapRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .single()

        if (updatedProfile) {
          setUser(updatedProfile)
        } else {
          setUser(data)
        }
      } else {
        setUser(data)
      }
    }
    setLoading(false)
  }

  return <>{children}</>
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function parseEmailList(value?: string) {
  if (!value) return [] as string[]
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeEmail)
}

const adminEmails = parseEmailList(import.meta.env.VITE_ADMIN_EMAILS)
const superAdminEmails = parseEmailList(import.meta.env.VITE_SUPER_ADMIN_EMAILS)

function getBootstrapRole(email?: string | null): UserRole | null {
  if (!email) return null
  const normalized = normalizeEmail(email)
  if (superAdminEmails.includes(normalized)) return 'super_admin'
  if (adminEmails.includes(normalized)) return 'admin'
  return null
}

const roleRank: Record<UserRole, number> = {
  member: 0,
  admin: 1,
  super_admin: 2,
}

function shouldUpgradeRole(current: UserRole, target: UserRole) {
  return roleRank[target] > roleRank[current]
}
