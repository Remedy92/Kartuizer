import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, KeyRound, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks'
import { Wordmark } from '@/components/shared'
import { cn } from '@/lib/utils'

type AuthMethod = 'magic' | 'password'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithMagicLink, signInWithPassword, resetPassword, isLoading, isAuthenticated } = useAuth()

  const [authMethod, setAuthMethod] = useState<AuthMethod>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)

  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard'

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate(from, { replace: true })
    return null
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)

    const result = await signInWithMagicLink(email)
    if (result.success) {
      setMagicLinkSent(true)
    } else {
      setError(result.error ?? 'Er is een fout opgetreden')
    }
  }

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)

    const result = await signInWithPassword(email, password)
    if (result.success) {
      if (result.needsVerification) {
        setNotice('Controleer je e-mail om je account te bevestigen.')
      } else {
        navigate(from, { replace: true })
      }
    } else {
      setError(result.error ?? 'Er is een fout opgetreden')
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('Vul eerst je e-mailadres in')
      return
    }
    setError(null)
    setNotice(null)

    const result = await resetPassword(email)
    if (result.success) {
      setResetEmailSent(true)
    } else {
      setError(result.error ?? 'Er is een fout opgetreden')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-primary-50/30 flex flex-col justify-center items-center p-6">
      {/* Decorative elements */}
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
            <h2 className="text-2xl font-serif text-stone-800 mb-2">Inloggen</h2>
            <p className="text-stone-500 text-sm">Toegang tot het stemplatform</p>
          </div>

          {magicLinkSent || resetEmailSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-stone-800 mb-2">Controleer je inbox</h3>
              <p className="text-stone-500 text-sm mb-6">
                {resetEmailSent
                  ? 'We hebben een link gestuurd om je wachtwoord te resetten naar'
                  : 'We hebben een inloglink gestuurd naar'}
                <br />
                <span className="font-medium text-stone-700">{email}</span>
              </p>
              <button
                onClick={() => {
                  setMagicLinkSent(false)
                  setResetEmailSent(false)
                  setEmail('')
                }}
                className="text-sm text-primary-700 hover:text-primary-800 font-medium"
              >
                Ander e-mailadres gebruiken
              </button>
            </motion.div>
          ) : (
            <>
              {/* Auth Method Tabs */}
              <div className="flex mb-8 border-b border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('magic')
                    setError(null)
                    setNotice(null)
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-all -mb-px',
                    authMethod === 'magic'
                      ? 'border-primary-700 text-primary-800'
                      : 'border-transparent text-stone-500 hover:text-stone-700'
                  )}
                >
                  <Mail size={16} />
                  Magic Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('password')
                    setError(null)
                    setNotice(null)
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-all -mb-px',
                    authMethod === 'password'
                      ? 'border-primary-700 text-primary-800'
                      : 'border-transparent text-stone-500 hover:text-stone-700'
                  )}
                >
                  <KeyRound size={16} />
                  Wachtwoord
                </button>
              </div>

              <form
                onSubmit={authMethod === 'magic' ? handleMagicLink : handlePasswordAuth}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-2 tracking-wider uppercase">
                    E-mailadres
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-stone-50 border-0 border-b-2 border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-primary-600 focus:ring-0 focus:bg-white transition-all"
                    placeholder="naam@voorbeeld.be"
                  />
                </div>

                {authMethod === 'password' && (
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-2 tracking-wider uppercase">
                      Wachtwoord
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-stone-50 border-0 border-b-2 border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-primary-600 focus:ring-0 focus:bg-white transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={isLoading}
                      className="mt-2 text-sm text-primary-700 hover:text-primary-800 font-medium disabled:opacity-50"
                    >
                      Wachtwoord vergeten?
                    </button>
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-l-2 border-rose-500 bg-rose-50 p-3 text-sm text-rose-700"
                  >
                    {error}
                  </motion.div>
                )}

                {notice && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-l-2 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-700"
                  >
                    {notice}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary-800 text-white py-4 text-sm tracking-widest uppercase font-medium hover:bg-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : authMethod === 'magic' ? (
                    'Verstuur link'
                  ) : (
                    'Inloggen'
                  )}
                </button>

                {authMethod === 'magic' && (
                  <p className="text-xs text-stone-400 text-center">
                    Nieuw? Je account wordt automatisch aangemaakt.
                  </p>
                )}
              </form>
            </>
          )}
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full mt-8 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          &larr; Terug
        </button>
      </motion.div>
    </div>
  )
}
