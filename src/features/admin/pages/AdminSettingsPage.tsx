import { useState, useMemo } from 'react'
import { Loader2, UserCheck, Settings } from 'lucide-react'
import { useAppSettings, useUpdateAppSettings, useToast } from '@/hooks'
import { Button, Card, CardContent } from '@/components/ui'

export function AdminSettingsPage() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSettings = useUpdateAppSettings()
  const { success, error: showError } = useToast()

  // Use local state that starts from settings, or defaults to true
  const initialValue = settings?.require_user_approval ?? true
  const [requireApproval, setRequireApproval] = useState<boolean | null>(null)

  // Compute effective value: local override or server value
  const effectiveValue = requireApproval ?? initialValue
  const hasChanges = useMemo(
    () => requireApproval !== null && requireApproval !== settings?.require_user_approval,
    [requireApproval, settings?.require_user_approval]
  )

  const handleToggle = (value: boolean) => {
    setRequireApproval(value)
  }

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ require_user_approval: effectiveValue })
      success('Opgeslagen', 'Instellingen zijn bijgewerkt.')
      setRequireApproval(null) // Reset local override after save
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Opslaan mislukt')
    }
  }

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-serif text-stone-800 mb-2">Instellingen</h1>
        <p className="text-stone-500">Beheer platform-instellingen</p>
      </header>

      <div className="space-y-6">
        <Card>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-stone-800 mb-1">
                      Gebruikersgoedkeuring vereisen
                    </h3>
                    <p className="text-sm text-stone-500">
                      Nieuwe gebruikers moeten worden goedgekeurd door een beheerder voordat ze toegang krijgen tot het platform.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={effectiveValue}
                      onChange={(e) => handleToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="mt-4 p-3 bg-stone-50 rounded-lg">
                  <p className="text-xs text-stone-500">
                    {effectiveValue ? (
                      <>
                        <span className="font-medium text-amber-700">Ingeschakeld:</span>{' '}
                        Nieuwe gebruikers zien een wachtscherm tot een beheerder ze goedkeurt.
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-emerald-700">Uitgeschakeld:</span>{' '}
                        Nieuwe gebruikers krijgen direct toegang na registratie.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasChanges && (
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              loading={updateSettings.isPending}
            >
              Wijzigingen opslaan
            </Button>
          </div>
        )}

        <Card>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                <Settings className="w-5 h-5 text-stone-500" />
              </div>
              <div>
                <h3 className="font-medium text-stone-800 mb-1">Meer instellingen</h3>
                <p className="text-sm text-stone-500">
                  Aanvullende platform-instellingen komen beschikbaar in toekomstige updates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
