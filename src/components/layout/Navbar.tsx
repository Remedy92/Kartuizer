import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Menu } from 'lucide-react'
import { useAuthStore, useUIStore } from '@/stores'
import { useToast } from '@/hooks'
import { Wordmark } from '@/components/shared'
import { cn } from '@/lib/utils'

export function Navbar() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const { error: showError } = useToast()
  const signOut = useAuthStore((s) => s.signOut)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (err) {
      showError('Uitloggen mislukt', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-12">
            <Wordmark onClick={() => navigate('/')} />

            <div className="hidden md:flex items-center gap-1">
              <NavTab to="/dashboard">Overzicht</NavTab>
              <NavTab to="/archive">Archief</NavTab>
              <NavTab to="/groepen">Groepen</NavTab>
              {isAdmin && (
                <NavTab to="/admin">Beheer</NavTab>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Mobile menu button - 44px touch target */}
            <button
              onClick={toggleSidebar}
              className="md:hidden w-11 h-11 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all rounded-full"
              aria-label={sidebarOpen ? 'Navigatie inklappen' : 'Navigatie uitklappen'}
              aria-expanded={sidebarOpen}
              aria-controls="admin-mobile-nav"
            >
              <span className="flex items-center gap-1">
                <Menu size={20} />
                <ChevronDown
                  size={14}
                  className={cn('transition-transform duration-200', sidebarOpen && 'rotate-180')}
                />
              </span>
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-stone-700 truncate max-w-[180px]">
                {session?.user?.email}
              </p>
              <p className="text-xs text-stone-400">
                {isAdmin ? 'Beheerder' : 'Bestuurslid'}
              </p>
            </div>

            <button
              onClick={handleSignOut}
              className="w-11 h-11 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all rounded-full"
              title="Uitloggen"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

interface NavTabProps {
  to: string
  children: React.ReactNode
}

function NavTab({ to, children }: NavTabProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center px-4 py-2 text-sm font-medium relative transition-all duration-200',
          isActive
            ? 'text-primary-800 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-800'
            : 'text-stone-500 hover:text-stone-800'
        )
      }
    >
      {children}
    </NavLink>
  )
}
