import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useAuthStore } from '@/stores'
import { apiFetch } from '@/lib/api'
import type { UserProfile } from '@/types'
import type { AppSession } from '@/types/auth'

interface AuthResult {
  success: boolean
  error?: string
  needsVerification?: boolean
  needsPasswordReset?: boolean
  needsApproval?: boolean
  notice?: string
  devMagicLinkUrl?: string
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const session = useAuthStore((s) => s.session)
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const setAuthLoading = useAuthStore((s) => s.setLoading)
  const signOut = useAuthStore((s) => s.signOut)
  const setSession = useAuthStore((s) => s.setSession)
  const setUser = useAuthStore((s) => s.setUser)

  async function syncAuthenticatedUser() {
    setAuthLoading(true)
    try {
      const sessionState = await authClient.getSession()
      const nextSession = (sessionState.data ?? null) as AppSession | null

      setSession(nextSession)

      if (!nextSession) {
        setUser(null)
        return
      }

      const payload = await apiFetch<{ session: AppSession; profile: UserProfile | null }>('/api/me')
      setSession(payload.session)
      setUser(payload.profile)
      return payload.profile
    } finally {
      setAuthLoading(false)
    }
  }

  async function signInWithMagicLink(email: string): Promise<AuthResult> {
    setIsLoading(true)
    try {
      const result = await apiFetch<{ status: boolean; devMagicLinkUrl?: string }>('/api/internalauth/sign-in-magic-link', {
        method: 'POST',
        body: JSON.stringify({
          email,
          name: email,
          callbackURL: '/dashboard',
        }),
      })

      if (result.devMagicLinkUrl) {
        return { success: true, devMagicLinkUrl: result.devMagicLinkUrl, notice: 'Dev mode: klik de link hieronder om in te loggen.' }
      }

      return { success: true, notice: 'We hebben je een loginlink gemaild. Controleer je inbox.' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Er is een fout opgetreden' }
    } finally {
      setIsLoading(false)
    }
  }

  async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
    setIsLoading(true)
    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      })

      if (signInError) {
        const signInMessage = (signInError.message ?? '').toLowerCase()
        if (signInMessage.includes('verify') || signInMessage.includes('verification')) {
          await apiFetch('/api/internalauth/send-verification-email', {
            method: 'POST',
            body: JSON.stringify({
              email,
              callbackURL: `${window.location.origin}/dashboard`,
            }),
          })

          return {
            success: true,
            needsVerification: true,
            notice: 'We hebben je bevestigingsmail opnieuw verstuurd.',
          }
        }

        if (
          signInMessage.includes('invalid login credentials') ||
          signInMessage.includes('invalid email or password')
        ) {
          try {
            await apiFetch('/api/internalauth/sign-up-email', {
              method: 'POST',
              body: JSON.stringify({
                email,
                password,
                name: email,
                callbackURL: '/dashboard',
              }),
            })
            return { success: true, needsVerification: true }
          } catch (signUpError) {
            return {
              success: false,
              error: signUpError instanceof Error ? signUpError.message : 'Er is een fout opgetreden',
            }
          }
        }

        return { success: false, error: signInError.message }
      }

      const profile = await syncAuthenticatedUser()
      return { success: true, needsApproval: profile?.approval_status === 'pending' }
    } finally {
      setIsLoading(false)
    }
  }

  async function resetPassword(email: string): Promise<AuthResult> {
    setIsLoading(true)
    try {
      await apiFetch('/api/internalauth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Er is een fout opgetreden' }
    } finally {
      setIsLoading(false)
    }
  }

  async function updatePassword(newPassword: string): Promise<AuthResult> {
    setIsLoading(true)
    try {
      const token = new URLSearchParams(window.location.search).get('token')
      if (!token) {
        return { success: false, error: 'Ongeldige of verlopen link.' }
      }
      const { error } = await authClient.resetPassword({ newPassword, token })
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
