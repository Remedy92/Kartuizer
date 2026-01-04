import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, MessageSquare, Pencil, Send, Trash2, X } from 'lucide-react'
import type { QuestionStatus, VoteComment } from '@/types'
import { useAuthStore } from '@/stores'
import { useDeleteVoteComment, useToast, useUpsertVoteComment } from '@/hooks'
import { cn, formatDateTime } from '@/lib/utils'

interface VoteCommentSectionProps {
  questionId: string
  status: QuestionStatus
  comments?: VoteComment[]
}

function truncate(text: string, maxLength: number) {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength)}…`
}

function getAuthorLabel(comment: VoteComment) {
  const name = comment.user_profiles?.display_name?.trim()
  if (name) return name

  const email = comment.user_profiles?.email?.trim()
  if (email) return email.split('@')[0]

  return 'Onbekend'
}

function getInitials(label: string) {
  const normalized = label.trim().replace(/[^a-zA-Z0-9]+/g, ' ')
  const parts = normalized.split(' ').map((p) => p.trim()).filter(Boolean)

  if (parts.length === 0) return '?'

  if (parts.length === 1) {
    const [a, b] = parts[0]
    return `${(a ?? '?').toUpperCase()}${(b ?? '').toUpperCase()}`
  }

  const first = parts[0][0] ?? '?'
  const last = parts[parts.length - 1][0] ?? ''
  return `${first.toUpperCase()}${last.toUpperCase()}`
}

export function VoteCommentSection({
  questionId,
  status,
  comments,
}: VoteCommentSectionProps) {
  const session = useAuthStore((s) => s.session)
  const { error: showError, success: showSuccess } = useToast()
  const upsertMutation = useUpsertVoteComment()
  const deleteMutation = useDeleteVoteComment()

  const userId = session?.user?.id

  const thread = useMemo(() => {
    const list = [...(comments ?? [])]
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return list
  }, [comments])

  const existing = useMemo(() => {
    if (!userId) return undefined
    return thread.find((c) => c.user_id === userId)
  }, [thread, userId])

  const [isOpen, setIsOpen] = useState(Boolean(existing))
  const [isComposing, setIsComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [scrollToMineRequest, setScrollToMineRequest] = useState(0)

  const mineRef = useRef<HTMLLIElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (isComposing) {
      textareaRef.current?.focus()
    }
  }, [isComposing])

  useEffect(() => {
    if (scrollToMineRequest === 0) return
    if (!existing?.id) return
    mineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [existing?.id, scrollToMineRequest])

  const latest = thread.at(-1)
  const latestPreview = latest?.comment?.trim()
  const previewText = latestPreview ? truncate(latestPreview, 60) : null

  const isBusy = upsertMutation.isPending || deleteMutation.isPending
  const canInteract = status === 'open' && Boolean(userId)

  const original = existing?.comment ?? ''
  const value = draft
  const trimmed = value.trim()
  const isChanged = trimmed !== original.trim()
  const canSubmit = canInteract && !isBusy && trimmed.length > 0 && trimmed.length <= 2000 && isChanged

  const startComposing = () => {
    if (status !== 'open') return
    if (!userId) return
    setDraft(existing?.comment ?? '')
    setIsComposing(true)
    setIsOpen(true)
  }

  const stopComposing = () => {
    setIsComposing(false)
    setDraft('')
  }

  const handleSubmit = async () => {
    try {
      await upsertMutation.mutateAsync({ questionId, comment: value })
      stopComposing()
      setIsOpen(true)
      setScrollToMineRequest((v) => v + 1)
      showSuccess(existing ? 'Reactie aangepast' : 'Reactie geplaatst')
    } catch (err) {
      showError('Reactie opslaan mislukt', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ questionId })
      stopComposing()
      showSuccess('Reactie verwijderd')
    } catch (err) {
      showError('Reactie verwijderen mislukt', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

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
            <div className="flex items-center gap-2">
              <p className="text-xs text-stone-500 uppercase tracking-wide">Reacties</p>
              {thread.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-medium rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  {thread.length}
                </span>
              )}
            </div>
            {!isOpen && (
              <p className="text-sm text-stone-600 truncate">
                {previewText ? `${getAuthorLabel(latest!)}: ${previewText}` : 'Nog geen reacties'}
              </p>
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

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              <p className="text-xs text-stone-500 leading-relaxed">
                Reacties staan los van je stem. Deel context, vragen of bezwaren met de groep.
              </p>

              {thread.length === 0 ? (
                <div className="text-sm text-stone-500 bg-stone-50 border border-stone-200/70 rounded-md px-3 py-2">
                  Nog geen reacties. Start de discussie.
                </div>
              ) : (
                <ul className="space-y-3">
                  {thread.map((comment) => {
                    const isMine = Boolean(userId) && comment.user_id === userId
                    const authorLabel = getAuthorLabel(comment)
                    const author = isMine && authorLabel === 'Onbekend' ? 'Jij' : authorLabel
                    const timestamp = formatDateTime(comment.updated_at ?? comment.created_at)
                    const initials = getInitials(author)

                    return (
                      <li
                        key={comment.id}
                        ref={isMine ? mineRef : null}
                        className="flex items-start gap-3"
                      >
                        <div
                          className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
                            isMine ? 'bg-primary-100 text-primary-800' : 'bg-stone-100 text-stone-700'
                          )}
                          aria-hidden="true"
                        >
                          {initials}
                        </div>

                        <div
                          className={cn(
                            'min-w-0 flex-1 rounded-lg border px-3 py-2.5',
                            isMine ? 'bg-primary-50 border-primary-200/70' : 'bg-stone-50 border-stone-200/70'
                          )}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium text-stone-800 truncate">{author}</p>
                            <p className="text-[11px] text-stone-400 flex-shrink-0">{timestamp}</p>
                          </div>

                          <p className="mt-1 text-sm text-stone-700 whitespace-pre-wrap break-words">
                            {comment.comment}
                          </p>

                          {isMine && (
                            <div className="mt-2 flex items-center gap-3">
                              {status === 'open' && Boolean(userId) && (
                                <button
                                  type="button"
                                  onClick={startComposing}
                                  className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Bewerken
                                </button>
                              )}

                              {status === 'open' && Boolean(userId) && (
                                <button
                                  type="button"
                                  onClick={handleDelete}
                                  disabled={isBusy}
                                  className={cn(
                                    'inline-flex items-center gap-1 text-xs text-stone-500 hover:text-rose-700',
                                    isBusy && 'opacity-60 cursor-not-allowed'
                                  )}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Verwijderen
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {status !== 'open' && (
                <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200/70 rounded-md px-3 py-2">
                  Deze vraag is afgerond; reacties kunnen niet meer aangepast worden.
                </div>
              )}

              {status === 'open' && !userId && (
                <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200/70 rounded-md px-3 py-2">
                  Log in om te reageren.
                </div>
              )}

              {status === 'open' && userId && (
                <div className="space-y-2">
                  <AnimatePresence initial={false} mode="wait">
                    {isComposing ? (
                      <motion.div
                        key="composer"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        className="space-y-2"
                      >
                        <textarea
                          ref={textareaRef}
                          className={cn('input-field min-h-[96px] resize-y', isBusy && 'opacity-70')}
                          value={value}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder={existing ? 'Bewerk je reactie…' : 'Schrijf een reactie…'}
                          disabled={!canInteract}
                          maxLength={2000}
                        />

                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={cn(
                              'btn btn-primary w-full sm:w-auto',
                              !canSubmit && 'opacity-60 cursor-not-allowed'
                            )}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {isBusy ? 'Bezig...' : existing ? 'Opslaan' : 'Plaatsen'}
                          </button>

                          <button
                            type="button"
                            onClick={stopComposing}
                            disabled={isBusy}
                            className={cn(
                              'btn btn-outline w-full sm:w-auto',
                              isBusy && 'opacity-60 cursor-not-allowed'
                            )}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Annuleren
                          </button>
                        </div>

                        {trimmed.length > 2000 && (
                          <p className="text-xs text-rose-600">Maximaal 2000 tekens.</p>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="start"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                      >
                        <button
                          type="button"
                          onClick={startComposing}
                          className="w-full text-left rounded-md border border-stone-200/70 bg-white px-3 py-3 text-sm text-stone-500 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                        >
                          {existing ? 'Bewerk je reactie…' : 'Schrijf een reactie…'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
