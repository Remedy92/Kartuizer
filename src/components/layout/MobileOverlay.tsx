import { useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, LayoutDashboard, Archive, Users, Settings } from 'lucide-react'
import { useAuthStore, useUIStore } from '@/stores'
import { useToast } from '@/hooks'
import { cn } from '@/lib/utils'

export function MobileOverlay() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useAuthStore((s) => s.session)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const signOut = useAuthStore((s) => s.signOut)
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen)
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen)
  const { error: showError } = useToast()

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname, setMobileMenuOpen])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const handleSignOut = async () => {
    try {
      await signOut()
      setMobileMenuOpen(false)
      navigate('/', { replace: true })
    } catch (err) {
      showError('Uitloggen mislukt', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  return (
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu panel */}
          <motion.nav
            id="mobile-nav-overlay"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden fixed top-20 left-0 right-0 bg-white border-b border-stone-200 shadow-lg z-50"
            aria-label="Mobiele navigatie"
          >
            <div className="max-w-6xl mx-auto px-6 py-6">
              {/* Navigation links */}
              <div className="space-y-1">
                <MobileNavLink to="/dashboard" icon={LayoutDashboard}>
                  Overzicht
                </MobileNavLink>
                <MobileNavLink to="/groepen" icon={Users}>
                  Groepen
                </MobileNavLink>
                <MobileNavLink to="/archive" icon={Archive}>
                  Archief
                </MobileNavLink>
                {isAdmin && (
                  <MobileNavLink to="/admin" icon={Settings}>
                    Beheer
                  </MobileNavLink>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-stone-200 my-5" />

              {/* User info + sign out */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-800 truncate max-w-[200px]">
                    {session?.user?.email}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {isAdmin ? 'Beheerder' : 'Bestuurslid'}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <LogOut size={18} />
                  <span>Uitloggen</span>
                </button>
              </div>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
}

interface MobileNavLinkProps {
  to: string
  icon: React.ElementType
  children: React.ReactNode
}

function MobileNavLink({ to, icon: Icon, children }: MobileNavLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-4 py-3.5 rounded-lg text-base font-medium transition-colors min-h-[56px]',
          isActive
            ? 'bg-primary-100 text-primary-800'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
        )
      }
    >
      <Icon size={20} strokeWidth={1.75} />
      {children}
    </NavLink>
  )
}
