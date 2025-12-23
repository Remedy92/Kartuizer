import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, Loader2, Mail, Clock, ArrowLeft } from 'lucide-react'
import { usePendingUsers, useApproveUser, useRejectUser, useToast } from '@/hooks'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { formatDate } from '@/lib/utils'

export function AdminPendingUsersPage() {
  const { data: pendingUsers, isLoading } = usePendingUsers()
  const approveUser = useApproveUser()
  const rejectUser = useRejectUser()
  const { success, error: showError } = useToast()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleApprove = async (userId: string, email: string) => {
    setProcessingId(userId)
    try {
      await approveUser.mutateAsync(userId)
      success('Goedgekeurd', `${email} heeft nu toegang tot het platform.`)
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Goedkeuren mislukt')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (userId: string, email: string) => {
    if (!confirm(`Weet je zeker dat je ${email} wilt weigeren? Dit verwijdert het account permanent.`)) {
      return
    }

    setProcessingId(userId)
    try {
      await rejectUser.mutateAsync(userId)
      success('Geweigerd', `${email} is verwijderd.`)
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Weigeren mislukt')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div>
      <header className="mb-8">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4"
        >
          <ArrowLeft size={14} />
          Terug naar gebruikers
        </Link>
        <h1 className="text-3xl font-serif text-stone-800 mb-2">Wachtende Gebruikers</h1>
        <p className="text-stone-500">Nieuwe registraties die wachten op goedkeuring</p>
      </header>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : !pendingUsers || pendingUsers.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-stone-400" />
          </div>
          <p className="text-stone-500 italic">Geen wachtende gebruikers</p>
          <p className="text-sm text-stone-400 mt-1">Alle registraties zijn verwerkt</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-stone-800 truncate">{user.email}</p>
                      <Badge variant="warning">Wachtend</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-stone-500">
                      <Mail size={12} className="flex-shrink-0" />
                      <span>Geregistreerd {formatDate(user.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-14 md:ml-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(user.id, user.email)}
                    disabled={processingId === user.id}
                    className="text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                  >
                    {processingId === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <X size={16} className="mr-1" />
                        Weigeren
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(user.id, user.email)}
                    disabled={processingId === user.id}
                  >
                    {processingId === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check size={16} className="mr-1" />
                        Goedkeuren
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
