import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useUserGroups } from '@/hooks'
import { useAuthStore } from '@/stores'
import { useToast } from '@/hooks'
import { CreateQuestionForm } from '@/features/questions/components/CreateQuestionForm'

export function CreateAgendaItemPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const { data: memberships, isLoading, error } = useUserGroups(session?.user?.id ?? '')
  const { error: showError } = useToast()
  const lastErrorRef = useRef<string | null>(null)

  useEffect(() => {
    if (!error) {
      lastErrorRef.current = null
      return
    }

    const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
    if (lastErrorRef.current === message) return
    lastErrorRef.current = message
    showError('Groepen laden mislukt', message)
  }, [error, showError])

  const groupOptions = (memberships ?? [])
    .map((m) => m.groups)
    .filter(Boolean)
    .sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''))
    .map((g) => ({ value: g!.id, label: g!.name }))

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-rose-600">Er is een fout opgetreden bij het laden van uw groepen.</p>
        <p className="text-sm text-rose-500 mt-2">
          {error instanceof Error ? error.message : 'Controleer je rechten en de Supabase-verbinding.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      {groupOptions.length === 0 && (
        <div className="mb-8 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
          U bent nog niet toegevoegd aan een groep. Neem contact op met een beheerder.
        </div>
      )}

      <CreateQuestionForm
        groupOptions={groupOptions}
        groupsLoading={false}
        headerSubtitle="Maak een stemming of poll aan voor uw groep"
        onCancel={() => navigate('/dashboard')}
        onSuccess={() => navigate('/dashboard')}
      />
    </div>
  )
}

