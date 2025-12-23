import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { Wordmark } from '@/components/shared'

export function LandingPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const isLoading = useAuthStore((s) => s.isLoading)

  // If a recovery link lands on "/", forward it to /reset-password
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
    const searchParams = new URLSearchParams(window.location.search)
    const type = searchParams.get('type') ?? hashParams.get('type')
    const hasRecoveryToken =
      !!(searchParams.get('token_hash') ?? hashParams.get('token_hash')) ||
      !!(searchParams.get('access_token') ?? hashParams.get('access_token')) ||
      !!(searchParams.get('code') ?? hashParams.get('code'))

    if (type === 'recovery' && hasRecoveryToken) {
      const fullQuery = window.location.search + window.location.hash
      navigate(`/reset-password${fullQuery}`, { replace: true })
    }
  }, [navigate])

  // Auto-redirect logged-in users to dashboard
  useEffect(() => {
    if (!isLoading && session) {
      navigate('/dashboard', { replace: true })
    }
  }, [session, isLoading, navigate])

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-svh bg-gradient-to-b from-stone-50 to-stone-100 overflow-hidden">
      {/* Subtle grain overlay */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />

      <header className="relative py-6 md:py-8 px-6 md:px-8 flex justify-between items-center max-w-6xl mx-auto w-full">
        <Wordmark size="large" />
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-stone-300 to-transparent hidden md:block" />
      </header>

      <main className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-10 sm:py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl space-y-8"
        >
          {/* Decorative line */}
          <div className="w-px h-14 sm:h-16 bg-gradient-to-b from-transparent via-primary-400 to-transparent mx-auto" />

          <h1 className="text-4xl md:text-6xl font-serif text-stone-800 leading-[1.15] tracking-tight">
            Jouw stem
            <br />
            <span className="text-primary-600 italic">jouw mening</span>
          </h1>

          <p className="text-lg md:text-xl text-stone-500 max-w-lg mx-auto leading-relaxed font-light">
            Het digitale stemplatform voor de Raad van Bestuur en Blokvoorzitters. Veilig,
            transparant en efficiënt.
          </p>

          <motion.button
            onClick={() => navigate(session ? '/dashboard' : '/login')}
            className="group relative bg-primary-800 text-white px-10 py-4 text-sm tracking-widest uppercase font-medium hover:bg-primary-900 transition-all duration-300"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10">{session ? 'Naar Dashboard' : 'Toegang'}</span>
            <div className="absolute inset-0 border border-primary-800 translate-x-1 translate-y-1 -z-10 group-hover:translate-x-1.5 group-hover:translate-y-1.5 transition-transform" />
          </motion.button>
        </motion.div>
      </main>

      <footer className="relative py-8 text-center">
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-stone-300 to-transparent mx-auto mb-6" />
        <p className="text-xs text-stone-400 tracking-wider uppercase">
          &copy; {new Date().getFullYear()} Domein Karthuizer
        </p>
      </footer>
    </div>
  )
}
