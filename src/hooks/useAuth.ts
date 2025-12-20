import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'

interface AuthResult {
  success: boolean
  error?: string
  needsVerification?: boolean
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const session = useAuthStore((s) => s.session)
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const signOut = useAuthStore((s) => s.signOut)

  async function signInWithMagicLink(email: string): Promise<AuthResult> {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } finally {
      setIsLoading(false)
    }
  }

  async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
    setIsLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // If user doesn't exist, try sign up
        if (signInError.message.includes('Invalid login credentials')) {
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          })

          if (signUpError) {
            return { success: false, error: signUpError.message }
          }

          return { success: true, needsVerification: true }
        }

        return { success: false, error: signInError.message }
      }

      return { success: true }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    session,
    user,
    isAdmin,
    isLoading,
    isAuthenticated: !!session,
    signInWithMagicLink,
    signInWithPassword,
    signOut,
  }
}
