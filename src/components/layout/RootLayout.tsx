import { Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/stores'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Navbar } from './Navbar'
import { MobileOverlay } from './MobileOverlay'

export function RootLayout() {
  const session = useAuthStore((s) => s.session)

  // If not authenticated, just render outlet (landing/login pages handle their own layout)
  if (!session) {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {!isSupabaseConfigured && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 text-sm px-6 py-3">
          Supabase is niet geconfigureerd. Stel `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` in
          en herstart de dev server.
        </div>
      )}
      <Navbar />
      <MobileOverlay />

      <main className="flex-1 max-w-6xl w-full mx-auto py-12 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
