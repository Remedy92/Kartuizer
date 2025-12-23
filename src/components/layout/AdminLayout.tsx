import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, FileQuestion, Users, Settings, BarChart3, Cog } from 'lucide-react'
import { useUIStore } from '@/stores'
import { usePendingUsersCount } from '@/hooks'
import { cn } from '@/lib/utils'

export function AdminLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const { data: pendingCount } = usePendingUsersCount()

  return (
    <div>
      {/* Mobile Admin Navigation - visible only below lg breakpoint */}
      <div
        className={cn(
          'lg:hidden mb-6 transition-all duration-200 overflow-hidden',
          sidebarOpen ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        )}
      >
        <nav
          id="admin-mobile-nav"
          className="-mx-6 px-4 overflow-x-auto scrollbar-hide"
          aria-hidden={!sidebarOpen}
        >
          <div className="flex gap-2 pb-2">
            <AdminMobileNavLink to="/admin" end icon={LayoutDashboard}>
              Overzicht
            </AdminMobileNavLink>
            <AdminMobileNavLink to="/admin/questions" icon={FileQuestion}>
              Vragen
            </AdminMobileNavLink>
            <AdminMobileNavLink to="/admin/groups" icon={Settings}>
              Groepen
            </AdminMobileNavLink>
            <AdminMobileNavLink to="/admin/users" icon={Users} badge={pendingCount}>
              Gebruikers
            </AdminMobileNavLink>
            <AdminMobileNavLink to="/admin/analytics" icon={BarChart3}>
              Statistieken
            </AdminMobileNavLink>
            <AdminMobileNavLink to="/admin/settings" icon={Cog}>
              Instellingen
            </AdminMobileNavLink>
          </div>
        </nav>
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar - visible only at lg breakpoint and above */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
        <div className="sticky top-32">
          <nav className="space-y-1">
            <AdminNavLink to="/admin" end icon={LayoutDashboard}>
              Overzicht
            </AdminNavLink>
            <AdminNavLink to="/admin/questions" icon={FileQuestion}>
              Vragen
            </AdminNavLink>
            <AdminNavLink to="/admin/groups" icon={Settings}>
              Groepen
            </AdminNavLink>
            <AdminNavLink to="/admin/users" icon={Users} badge={pendingCount}>
              Gebruikers
            </AdminNavLink>
            <AdminNavLink to="/admin/analytics" icon={BarChart3}>
              Statistieken
            </AdminNavLink>
            <AdminNavLink to="/admin/settings" icon={Cog}>
              Instellingen
            </AdminNavLink>
          </nav>
        </div>
      </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

interface AdminNavLinkProps {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
  end?: boolean
  badge?: number
}

function AdminNavLink({ to, icon: Icon, children, end, badge }: AdminNavLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all',
          isActive
            ? 'bg-primary-50 text-primary-800'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
        )
      }
    >
      <Icon size={18} />
      <span className="flex-1">{children}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

function AdminMobileNavLink({ to, icon: Icon, children, end, badge }: AdminNavLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all min-h-[44px]',
          isActive
            ? 'bg-primary-800 text-white'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        )
      }
    >
      <Icon size={16} />
      <span>{children}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </NavLink>
  )
}
