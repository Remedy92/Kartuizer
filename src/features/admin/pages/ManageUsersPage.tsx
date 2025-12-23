import { useState } from 'react'
import { Loader2, Mail, Shield, User } from 'lucide-react'
import { useUsers, useUpdateUser } from '@/hooks'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import type { UserRole } from '@/types'

export function ManageUsersPage() {
  const { data: users, isLoading } = useUsers()
  const updateUser = useUpdateUser()
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  const roleLabels = {
    member: 'Lid',
    admin: 'Beheerder',
  }

  const roleVariants = {
    member: 'default' as const,
    admin: 'primary' as const,
  }

  const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'member', label: roleLabels.member },
    { value: 'admin', label: roleLabels.admin },
  ]

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setUpdatingUserId(userId)
    try {
      await updateUser.mutateAsync({ id: userId, role })
    } finally {
      setUpdatingUserId(null)
    }
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
              <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* User info section */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                    {user.role === 'admin' ? (
                      <Shield className="w-5 h-5 text-primary-600" />
                    ) : (
                      <User className="w-5 h-5 text-stone-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-stone-800 truncate">
                        {user.display_name || user.email}
                      </p>
                      <Badge variant={roleVariants[user.role]}>{roleLabels[user.role]}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-stone-500">
                      <Mail size={12} className="flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>
                </div>

                {/* Controls section - stacks on mobile */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 ml-14 md:ml-0">
                  <div className="flex items-center gap-2">
                    <select
                      className="text-sm bg-white border border-stone-200 rounded-md px-3 py-2 text-stone-700 focus:border-primary-600 focus:ring-0 min-h-[44px]"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                      disabled={updatingUserId === user.id}
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {updatingUserId === user.id && (
                      <Button size="sm" variant="ghost" loading>
                        Opslaan
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-stone-400">
                    <span className="md:hidden">Aangemaakt: </span>
                    <span className="hidden md:inline">Aangemaakt</span>
                    <span className="md:block">{formatDate(user.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
