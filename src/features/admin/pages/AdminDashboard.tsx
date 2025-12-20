import { Link } from 'react-router-dom'
import { FileQuestion, Users, Settings, BarChart3, Plus, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { useAnalyticsStats } from '@/hooks'
import { Card, CardContent, Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'

export function AdminDashboard() {
  const { data: stats, isLoading } = useAnalyticsStats()

  return (
    <div>
      <header className="mb-10">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-stone-800 mb-2">Beheer</h1>
            <p className="text-stone-500">Overzicht van het stemplatform</p>
          </div>
          <div className="h-px bg-gradient-to-r from-stone-200 via-stone-200 to-transparent" />
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Openstaand"
          value={stats?.openQuestions}
          icon={Clock}
          color="text-primary-700"
          bgColor="bg-primary-50"
          loading={isLoading}
        />
        <StatCard
          label="Afgerond"
          value={stats?.completedQuestions}
          icon={CheckCircle}
          color="text-primary-700"
          bgColor="bg-primary-100/70"
          loading={isLoading}
        />
        <StatCard
          label="Totaal stemmen"
          value={stats?.totalVotes}
          icon={TrendingUp}
          color="text-primary-700"
          bgColor="bg-primary-50"
          loading={isLoading}
        />
        <StatCard
          label="Gebruikers"
          value={stats?.totalUsers}
          icon={Users}
          color="text-primary-700"
          bgColor="bg-primary-100/70"
          loading={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickAction
          to="/admin/questions/new"
          icon={Plus}
          title="Nieuwe vraag"
          description="Maak een nieuw agendapunt aan"
        />
        <QuickAction
          to="/admin/questions"
          icon={FileQuestion}
          title="Vragen beheren"
          description="Bekijk en beheer alle vragen"
        />
        <QuickAction
          to="/admin/groups"
          icon={Settings}
          title="Groepen beheren"
          description="Beheer organen en hun leden"
        />
        <QuickAction
          to="/admin/analytics"
          icon={BarChart3}
          title="Statistieken"
          description="Bekijk uitgebreide statistieken"
        />
        <QuickAction
          to="/admin/users"
          icon={Users}
          title="Gebruikers beheren"
          description="Beheer rollen en toegang"
          full
        />
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value?: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  loading?: boolean
}

function StatCard({ label, value, icon: Icon, color, bgColor, loading }: StatCardProps) {
  return (
    <Card className="border-stone-200">
      <CardContent className="flex items-center gap-4">
        <div className={cn('p-3 rounded-lg', bgColor)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-7 w-12 mb-1" />
          ) : (
            <p className="text-2xl font-semibold text-stone-800">{value ?? 0}</p>
          )}
          <p className="text-sm text-stone-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

interface QuickActionProps {
  to: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  full?: boolean
}

function QuickAction({ to, icon: Icon, title, description, full }: QuickActionProps) {
  return (
    <Link to={to} className={full ? 'md:col-span-2' : undefined}>
      <Card className="hover:border-primary-300 cursor-pointer transition-colors">
        <CardContent className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary-50 ring-1 ring-primary-100">
            <Icon className="w-5 h-5 text-primary-700" />
          </div>
          <div>
            <p className="font-medium text-stone-800">{title}</p>
            <p className="text-sm text-stone-500">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
