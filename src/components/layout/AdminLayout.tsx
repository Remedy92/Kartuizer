import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileQuestion, Users, Settings, BarChart3, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminLayout() {
  const navigate = useNavigate()

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 hidden lg:block">
        <div className="sticky top-32">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Terug naar dashboard
          </button>

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
            <AdminNavLink to="/admin/users" icon={Users}>
              Gebruikers
            </AdminNavLink>
            <AdminNavLink to="/admin/analytics" icon={BarChart3}>
              Statistieken
            </AdminNavLink>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}

interface AdminNavLinkProps {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
  end?: boolean
}

function AdminNavLink({ to, icon: Icon, children, end }: AdminNavLinkProps) {
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
      {children}
    </NavLink>
  )
}
