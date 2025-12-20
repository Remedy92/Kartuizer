import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { KeyRound, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth, useToast } from '@/hooks'
import { useAuthStore } from '@/stores'
import { Wordmark } from '@/components/shared'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { updatePassword, isLoading } = useAuth()
  const { error: showError } = useToast()

  // Session is auto-created by Supabase from URL tokens via detectSessionInUrl
  const session = useAuthStore((s) => s.session)
  const authLoading = useAuthStore((s) => s.isLoading)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens bevatten')
      return
    }

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen')
      return
    }

    const result = await updatePassword(password)
    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 2000)
    } else {
      const message = result.error ?? 'Er is een fout opgetreden'
      setError(message)
      showError('Wachtwoord wijzigen mislukt', message)
    }
  }

  // Determine what to show based on auth state
  const showLoading = authLoading
  const showInvalidLink = !authLoading && !session

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-primary-50/30 flex flex-col justify-center items-center p-6">
      <div className="fixed top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
      <div className="fixed bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <Wordmark size="large" />
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-stone-200/60 shadow-xl shadow-stone-200/50 p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif text-stone-800 mb-2">Nieuw Wachtwoord</h2>
            <p className="text-stone-500 text-sm">Kies een nieuw wachtwoord voor je account</p>
          </div>

          {showLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-stone-500 text-sm">Link verifiëren...</p>
            </div>
          ) : showInvalidLink ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-lg font-medium text-stone-800 mb-2">Ongeldige link</h3>
              <p className="text-stone-500 text-sm mb-6">
                Deze link is ongeldig of verlopen. Vraag een nieuwe link aan.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-primary-700 hover:text-primary-800 font-medium"
              >
                Vraag een nieuwe link aan
              </button>
            </motion.div>
          ) : success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-stone-800 mb-2">Wachtwoord gewijzigd</h3>
              <p className="text-stone-500 text-sm">
                Je wordt doorgestuurd naar het dashboard...
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-2 tracking-wider uppercase">
                  Nieuw wachtwoord
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-50 border-0 border-b-2 border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-primary-600 focus:ring-0 focus:bg-white transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 mb-2 tracking-wider uppercase">
                  Bevestig wachtwoord
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-stone-50 border-0 border-b-2 border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-primary-600 focus:ring-0 focus:bg-white transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-l-2 border-rose-500 bg-rose-50 p-3 text-sm text-rose-700"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-800 text-white py-4 text-sm tracking-widest uppercase font-medium hover:bg-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound size={16} />
                    Wachtwoord wijzigen
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full mt-8 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          &larr; Terug naar inloggen
        </button>
      </motion.div>
    </div>
  )
}
