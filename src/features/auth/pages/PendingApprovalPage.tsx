import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { Wordmark } from '@/components/shared'

export function PendingApprovalPage() {
  const navigate = useNavigate()
  const signOut = useAuthStore((s) => s.signOut)
  const user = useAuthStore((s) => s.user)

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>

            <h2 className="text-2xl font-serif text-stone-800 mb-4">
              Wachten op goedkeuring
            </h2>

            <p className="text-stone-500 mb-2">
              Uw account is aangemaakt en wacht op goedkeuring door een beheerder.
            </p>

            <p className="text-sm text-stone-400 mb-8">
              U ontvangt bericht zodra uw toegang is geactiveerd.
            </p>

            {user?.email && (
              <div className="border-t border-stone-200 pt-6 mb-6">
                <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">
                  Ingelogd als
                </p>
                <p className="text-stone-700 font-medium">{user.email}</p>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 bg-stone-100 text-stone-700 py-3 text-sm font-medium hover:bg-stone-200 transition-colors"
            >
              <LogOut size={16} />
              Uitloggen
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
