import { BarChart3, TrendingUp, Users, FileQuestion, Vote, Clock } from 'lucide-react'
import { useAnalyticsStats } from '@/hooks'
import { Card, CardContent, CardHeader, Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'

export function AnalyticsPage() {
  const { data: stats, isLoading } = useAnalyticsStats()

  return (
    <div>
      <header className="mb-10">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-stone-800 mb-2">Statistieken</h1>
            <p className="text-stone-500">Overzicht van het stemplatform</p>
          </div>
          <div className="h-px bg-gradient-to-r from-stone-200 via-stone-200 to-transparent" />
        </div>
      </header>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={FileQuestion}
          label="Totaal vragen"
          value={stats?.totalQuestions}
          loading={isLoading}
          color="text-primary-700"
          bgColor="bg-primary-50"
        />
        <StatCard
          icon={Clock}
          label="Openstaand"
          value={stats?.openQuestions}
          loading={isLoading}
          color="text-primary-700"
          bgColor="bg-primary-100/70"
        />
        <StatCard
          icon={Vote}
          label="Afgerond"
          value={stats?.completedQuestions}
          loading={isLoading}
          color="text-primary-700"
          bgColor="bg-primary-50"
        />
        <StatCard
          icon={TrendingUp}
          label="Totaal stemmen"
          value={stats?.totalVotes}
          loading={isLoading}
          color="text-primary-700"
          bgColor="bg-primary-100/70"
        />
        <StatCard
          icon={Users}
          label="Gebruikers"
          value={stats?.totalUsers}
          loading={isLoading}
          color="text-primary-700"
          bgColor="bg-primary-50"
        />
        <StatCard
          icon={BarChart3}
          label="Groepen"
          value={stats?.totalGroups}
          loading={isLoading}
          color="text-primary-700"
          bgColor="bg-primary-100/70"
        />
      </div>

      {/* Placeholder for future charts */}
      <Card className="border-stone-200">
        <CardHeader>
          <h2 className="text-lg font-medium text-stone-800">Activiteit</h2>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-stone-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Gedetailleerde statistieken komen binnenkort</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: number
  loading?: boolean
  color: string
  bgColor: string
}

function StatCard({ icon: Icon, label, value, loading, color, bgColor }: StatCardProps) {
  return (
    <Card className="border-stone-200">
      <CardContent className="flex items-center gap-4">
        <div className={cn('p-3 rounded-lg ring-1 ring-primary-100', bgColor)}>
          <Icon className={cn('w-6 h-6', color)} />
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <p className="text-3xl font-semibold text-stone-800">{value ?? 0}</p>
          )}
          <p className="text-sm text-stone-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
