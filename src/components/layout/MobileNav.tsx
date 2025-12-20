import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const isAdmin = useAuthStore((s) => s.isAdmin)

  return (
    <div className="md:hidden bg-white border-b border-stone-100 px-4 py-2 flex gap-2 overflow-x-auto">
      <MobileNavTab to="/dashboard">Overzicht</MobileNavTab>
      <MobileNavTab to="/archive">Archief</MobileNavTab>
      {isAdmin && (
        <MobileNavTab to="/admin">Beheer</MobileNavTab>
      )}
    </div>
  )
}

interface MobileNavTabProps {
  to: string
  children: React.ReactNode
}

function MobileNavTab({ to, children }: MobileNavTabProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center px-4 py-2 text-sm rounded-full whitespace-nowrap transition-all',
          isActive
            ? 'bg-primary-800 text-white'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        )
      }
    >
      {children}
    </NavLink>
  )
}
