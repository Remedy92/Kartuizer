import { Loader2, Mail, Shield, User } from 'lucide-react'
import { useUsers } from '@/hooks'
import { Badge, Card, CardContent } from '@/components/ui'
import { formatDate } from '@/lib/utils'

export function ManageUsersPage() {
  const { data: users, isLoading } = useUsers()

  const roleLabels = {
    member: 'Lid',
    admin: 'Beheerder',
    super_admin: 'Super Admin',
  }

  const roleVariants = {
    member: 'default' as const,
    admin: 'primary' as const,
    super_admin: 'warning' as const,
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-serif text-stone-800 mb-2">Gebruikers</h1>
        <p className="text-stone-500">Overzicht van alle gebruikers</p>
      </header>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : !users || users.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-stone-500 italic">Geen gebruikers gevonden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                    {user.role === 'admin' || user.role === 'super_admin' ? (
                      <Shield className="w-5 h-5 text-primary-600" />
                    ) : (
                      <User className="w-5 h-5 text-stone-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-stone-800">
                        {user.display_name || user.email}
                      </p>
                      <Badge variant={roleVariants[user.role]}>{roleLabels[user.role]}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-stone-500">
                      <Mail size={12} />
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-stone-400">
                  <p>Aangemaakt</p>
                  <p>{formatDate(user.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
