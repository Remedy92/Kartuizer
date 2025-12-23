import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'

interface AuthResult {
  success: boolean
  error?: string
  needsVerification?: boolean
  needsPasswordReset?: boolean
  notice?: string
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
      const redirectUrl = `${window.location.origin}/dashboard`
      console.log('Magic link redirect URL:', redirectUrl)
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
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
        const signInMessage = signInError.message.toLowerCase()
        if (signInMessage.includes('email not confirmed')) {
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/dashboard`,
            },
          })

          if (resendError) {
            return { success: false, error: resendError.message }
          }

          return {
            success: true,
            needsVerification: true,
            notice: 'We hebben je bevestigingsmail opnieuw verstuurd.',
          }
        }

        // If user doesn't exist, try sign up
        if (signInMessage.includes('invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/dashboard`,
            },
          })

          if (!signUpError) {
            if (signUpData.session) {
              return { success: true }
            }

            return { success: true, needsVerification: true }
          }

          const signUpMessage = signUpError.message.toLowerCase()
          if (signUpMessage.includes('user already registered')) {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/reset-password`,
            })

            if (!resetError) {
              return {
                success: true,
                needsPasswordReset: true,
                notice: 'We hebben je een link gestuurd om een wachtwoord in te stellen.',
              }
            }

            const resetMessage = resetError.message.toLowerCase()
            if (resetMessage.includes('email not confirmed') || resetMessage.includes('not confirmed')) {
              const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: {
                  emailRedirectTo: `${window.location.origin}/dashboard`,
                },
              })

              if (!resendError) {
                return {
                  success: true,
                  needsVerification: true,
                  notice: 'We hebben je bevestigingsmail opnieuw verstuurd.',
                }
              }

              return { success: false, error: resendError.message }
            }

            return {
              success: false,
              error: resetError.message,
            }
          }

          return { success: false, error: signUpError.message }
        }

        return { success: false, error: signInError.message }
      }

      return { success: true }
    } finally {
      setIsLoading(false)
    }
  }

  async function resetPassword(email: string): Promise<AuthResult> {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) return { success: false, error: error.message }
      return { success: true }
    } finally {
      setIsLoading(false)
    }
  }

  async function updatePassword(newPassword: string): Promise<AuthResult> {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) return { success: false, error: error.message }
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
    resetPassword,
    updatePassword,
    signOut,
  }
}
