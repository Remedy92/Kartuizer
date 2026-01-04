import { useMemo, useState } from 'react'
import { ChevronDown, MessageSquare, Trash2 } from 'lucide-react'
import type { QuestionStatus, VoteComment } from '@/types'
import { useAuthStore } from '@/stores'
import { useDeleteVoteComment, useToast, useUpsertVoteComment } from '@/hooks'
import { cn } from '@/lib/utils'

interface VoteCommentSectionProps {
  questionId: string
  status: QuestionStatus
  comments?: VoteComment[]
  hasUserVoted: boolean
}

export function VoteCommentSection({
  questionId,
  status,
  comments,
  hasUserVoted,
}: VoteCommentSectionProps) {
  const session = useAuthStore((s) => s.session)
  const { error: showError, success: showSuccess } = useToast()
  const upsertMutation = useUpsertVoteComment()
  const deleteMutation = useDeleteVoteComment()

  const userId = session?.user?.id

  const existing = useMemo(() => {
    if (!userId) return undefined
    return (comments ?? []).find((c) => c.user_id === userId)
  }, [comments, userId])

  const [isOpen, setIsOpen] = useState(Boolean(existing))
  const [draft, setDraft] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  const value = isDirty ? draft : (existing?.comment ?? '')

  const isEditable = status === 'open' && Boolean(userId) && hasUserVoted
  const isBusy = upsertMutation.isPending || deleteMutation.isPending

  const trimmed = value.trim()
  const canSave = isEditable && !isBusy && isDirty && trimmed.length > 0 && trimmed.length <= 2000
  const canClear = status === 'open' && Boolean(userId) && !isBusy && Boolean(existing?.id)

  const preview = existing?.comment?.trim()
  const previewText = preview ? (preview.length > 50 ? `${preview.slice(0, 50)}…` : preview) : null

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({ questionId, comment: value })
      setIsDirty(false)
      showSuccess('Commentaar opgeslagen')
    } catch (err) {
      showError('Commentaar opslaan mislukt', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  const handleClear = async () => {
    try {
      await deleteMutation.mutateAsync({ questionId })
      setDraft('')
      setIsDirty(false)
      showSuccess('Commentaar verwijderd')
    } catch (err) {
      showError('Commentaar verwijderen mislukt', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  if (!userId) return null

  return (
    <section className="mt-6 pt-5 border-t border-stone-100">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
          <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-stone-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-stone-500 uppercase tracking-wide">Commentaar</p>
            {!isOpen && previewText && (
              <p className="text-sm text-stone-600 truncate">{previewText}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-stone-400 transition-transform',
            isOpen ? 'rotate-180' : 'rotate-0'
          )}
        />
      </button>

      {isOpen && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-stone-500 leading-relaxed">
            Optioneel. Dit commentaar wordt meegestuurd met de uitslag.
          </p>

          {!hasUserVoted && status === 'open' && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200/60 rounded-md px-3 py-2">
              Breng eerst uw stem uit om commentaar toe te voegen.
            </div>
          )}

          {status !== 'open' && (
            <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200/70 rounded-md px-3 py-2">
              Deze vraag is afgerond; commentaar kan niet meer aangepast worden.
            </div>
          )}

          <textarea
            className={cn(
              'input-field min-h-[96px] resize-y',
              !isEditable && 'bg-stone-50 text-stone-500'
            )}
            value={value}
            onChange={(e) => {
              setDraft(e.target.value)
              setIsDirty(true)
            }}
            placeholder="Licht uw stem toe (optioneel)"
            disabled={!isEditable}
            maxLength={2000}
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={cn('btn btn-primary w-full sm:w-auto', !canSave && 'opacity-60 cursor-not-allowed')}
            >
              {isBusy ? 'Bezig...' : 'Opslaan'}
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={!canClear}
              className={cn('btn btn-outline w-full sm:w-auto', !canClear && 'opacity-60 cursor-not-allowed')}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Verwijderen
            </button>
          </div>

          {trimmed.length > 2000 && (
            <p className="text-xs text-rose-600">Maximaal 2000 tekens.</p>
          )}
        </div>
      )}
    </section>
  )
}
