import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Loader2, CheckCircle, Clock, Trash2, XCircle, Pencil } from 'lucide-react'
import {
  useAllQuestions,
  useCloseQuestion,
  useDeleteQuestion,
  useUpdatePollDraft,
  useUpdateQuestion,
} from '@/hooks'
import { useToast } from '@/hooks'
import { Button, Badge, Modal, Input, Textarea } from '@/components/ui'
import { formatDate, cn } from '@/lib/utils'
import { calculateTotalVotes, calculateVoteSummary, getVoteResult } from '@/types'
import type { Question } from '@/types'

interface EditableOption {
  id: string
  label: string
  description: string
}

const generateId = () => Math.random().toString(36).substring(2, 9)

export function ManageQuestionsPage() {
  const { data: questions, isLoading } = useAllQuestions()
  const closeQuestion = useCloseQuestion()
  const deleteQuestion = useDeleteQuestion()
  const updatePollDraft = useUpdatePollDraft()
  const updateQuestion = useUpdateQuestion()
  const { success, error: showError } = useToast()

  const [questionToClose, setQuestionToClose] = useState<Question | null>(null)
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null)
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null)
  const [editQuestionTitle, setEditQuestionTitle] = useState('')
  const [editQuestionDescription, setEditQuestionDescription] = useState('')
  const [editQuestionDeadline, setEditQuestionDeadline] = useState('')
  const [pollToEdit, setPollToEdit] = useState<Question | null>(null)
  const [editOptions, setEditOptions] = useState<EditableOption[]>([])
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const formatDeadlineInput = (deadline?: string) => {
    if (!deadline) return ''
    const date = new Date(deadline)
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`
  }

  const openEditQuestion = (question: Question) => {
    setQuestionToEdit(question)
    setEditQuestionTitle(question.title)
    setEditQuestionDescription(question.description ?? '')
    setEditQuestionDeadline(formatDeadlineInput(question.deadline))
  }

  const openEditPoll = (question: Question) => {
    const existingOptions = (question.poll_options ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      description: o.description ?? '',
    }))

    setPollToEdit(question)
    setEditTitle(question.title)
    setEditDescription(question.description ?? '')
    setEditOptions(
      existingOptions.length > 0
        ? existingOptions
        : [
          { id: generateId(), label: '', description: '' },
          { id: generateId(), label: '', description: '' },
        ]
    )
  }

  const addEditOption = () => {
    setEditOptions((prev) => [...prev, { id: generateId(), label: '', description: '' }])
  }

  const removeEditOption = (id: string) => {
    setEditOptions((prev) => (prev.length > 2 ? prev.filter((o) => o.id !== id) : prev))
  }

  const updateEditOption = (id: string, field: 'label' | 'description', value: string) => {
    setEditOptions((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)))
  }

  const handleClose = async () => {
    if (!questionToClose) return

    try {
      await closeQuestion.mutateAsync({ id: questionToClose.id, method: 'manual' })
      success('Stemming gesloten', 'De stemming is succesvol afgesloten')
      setQuestionToClose(null)
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!questionToEdit) return

    const trimmedTitle = editQuestionTitle.trim()
    if (!trimmedTitle) {
      showError('Fout', 'Onderwerp is verplicht')
      return
    }

    try {
      await updateQuestion.mutateAsync({
        id: questionToEdit.id,
        title: trimmedTitle,
        description: editQuestionDescription.trim(),
        deadline: editQuestionDeadline || undefined,
      })
      success('Vraag bijgewerkt', 'De vraag is succesvol aangepast')
      setQuestionToEdit(null)
      setEditQuestionTitle('')
      setEditQuestionDescription('')
      setEditQuestionDeadline('')
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  const handleUpdatePollOptions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pollToEdit) return

    const validOptions = editOptions.filter((o) => o.label.trim())
    if (validOptions.length < 2) {
      showError('Fout', 'Een poll moet minimaal 2 opties hebben')
      return
    }

    try {
      await updatePollDraft.mutateAsync({
        id: pollToEdit.id,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        options: validOptions.map((o) => ({
          label: o.label.trim(),
          description: o.description.trim() || undefined,
        })),
      })
      success('Poll bijgewerkt', 'De opties zijn succesvol aangepast')
      setPollToEdit(null)
      setEditOptions([])
      setEditTitle('')
      setEditDescription('')
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  const handleDelete = async () => {
    if (!questionToDelete) return

    try {
      await deleteQuestion.mutateAsync(questionToDelete.id)
      success('Vraag verwijderd', 'De vraag is succesvol verwijderd')
      setQuestionToDelete(null)
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  const openQuestions = questions?.filter((q) => q.status === 'open') ?? []
  const completedQuestions = questions?.filter((q) => q.status === 'completed') ?? []

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-2">Vragen</h1>
          <p className="text-stone-500">Beheer alle stemmingen</p>
        </div>
        <Link to="/admin/questions/new">
          <Button>
            <Plus size={16} className="mr-2" />
            Nieuwe vraag
          </Button>
        </Link>
      </header>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Open Questions */}
          <section>
            <h2 className="text-lg font-medium text-stone-800 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-amber-600" />
              Openstaand ({openQuestions.length})
            </h2>
            {openQuestions.length === 0 ? (
              <p className="text-stone-500 italic py-4">Geen openstaande vragen</p>
            ) : (
              <div className="space-y-3">
                {openQuestions.map((question) => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    onClose={() => setQuestionToClose(question)}
                    onEditQuestion={() => openEditQuestion(question)}
                    onEditPoll={() => openEditPoll(question)}
                    onDelete={() => setQuestionToDelete(question)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Completed Questions */}
          <section>
            <h2 className="text-lg font-medium text-stone-800 mb-4 flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-600" />
              Afgerond ({completedQuestions.length})
            </h2>
            {completedQuestions.length === 0 ? (
              <p className="text-stone-500 italic py-4">Geen afgeronde vragen</p>
            ) : (
              <div className="space-y-3">
                {completedQuestions.map((question) => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    onDelete={() => setQuestionToDelete(question)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Close Modal */}
      <Modal
        open={!!questionToClose}
        onClose={() => setQuestionToClose(null)}
        title="Stemming sluiten"
        description="Weet je zeker dat je deze stemming wilt sluiten?"
      >
        <p className="text-stone-600 mb-6">
          De stemming voor &quot;{questionToClose?.title}&quot; wordt definitief gesloten. Leden
          kunnen daarna niet meer stemmen.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setQuestionToClose(null)}>
            Annuleren
          </Button>
          <Button onClick={handleClose} loading={closeQuestion.isPending}>
            Sluiten
          </Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        title="Vraag verwijderen"
        description="Weet je zeker dat je deze vraag wilt verwijderen?"
      >
        <p className="text-stone-600 mb-6">
          De vraag &quot;{questionToDelete?.title}&quot; en alle bijbehorende stemmen worden
          permanent verwijderd.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setQuestionToDelete(null)}>
            Annuleren
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteQuestion.isPending}>
            Verwijderen
          </Button>
        </div>
      </Modal>

      {/* Edit Question Modal */}
      <Modal
        open={!!questionToEdit}
        onClose={() => {
          setQuestionToEdit(null)
          setEditQuestionTitle('')
          setEditQuestionDescription('')
          setEditQuestionDeadline('')
        }}
        title="Vraag bewerken"
        description="Pas het onderwerp of de deadline aan zolang er nog geen stemmen zijn."
      >
        <form onSubmit={handleUpdateQuestion} className="space-y-4">
          <Input
            id="edit-question-title"
            label="Onderwerp"
            value={editQuestionTitle}
            onChange={(e) => setEditQuestionTitle(e.target.value)}
            required
          />
          <Textarea
            id="edit-question-description"
            label="Toelichting"
            value={editQuestionDescription}
            onChange={(e) => setEditQuestionDescription(e.target.value)}
            rows={3}
          />
          <Input
            id="edit-question-deadline"
            label="Deadline (optioneel)"
            type="datetime-local"
            value={editQuestionDeadline}
            onChange={(e) => setEditQuestionDeadline(e.target.value)}
          />

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setQuestionToEdit(null)
                setEditQuestionTitle('')
                setEditQuestionDescription('')
                setEditQuestionDeadline('')
              }}
            >
              Annuleren
            </Button>
            <Button type="submit" loading={updateQuestion.isPending} disabled={!editQuestionTitle.trim()}>
              Opslaan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Poll Options Modal */}
      <Modal
        open={!!pollToEdit}
        onClose={() => {
          setPollToEdit(null)
          setEditOptions([])
          setEditTitle('')
          setEditDescription('')
        }}
        title="Poll opties bewerken"
        description="Je kunt opties aanpassen zolang er nog geen stemmen zijn."
      >
        <form onSubmit={handleUpdatePollOptions} className="space-y-4">
          <div className="space-y-4">
            <Input
              id="edit-poll-title"
              label="Onderwerp"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
            <Textarea
              id="edit-poll-description"
              label="Toelichting"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
            />
          </div>

          <p className="text-xs text-stone-400">
            Niet bewerkbaar zodra er stemmen zijn uitgebracht.
          </p>

          <div className="space-y-3">
            {editOptions.map((option, index) => (
              <div key={option.id} className="flex gap-3 items-start">
                <div className="pt-2 w-6 flex-shrink-0">
                  <span className="text-xs font-medium text-stone-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <div className="flex-1 bg-stone-50 border border-stone-200 p-3">
                  <input
                    type="text"
                    placeholder="Optie naam"
                    value={option.label}
                    onChange={(e) => updateEditOption(option.id, 'label', e.target.value)}
                    className="w-full bg-transparent border-0 p-0 text-stone-800 placeholder:text-stone-400 focus:ring-0 font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Beschrijving (optioneel)"
                    value={option.description}
                    onChange={(e) => updateEditOption(option.id, 'description', e.target.value)}
                    className="w-full bg-transparent border-0 p-0 mt-2 text-sm text-stone-500 placeholder:text-stone-300 focus:ring-0"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeEditOption(option.id)}
                  disabled={editOptions.length <= 2}
                  className={cn(
                    'pt-2 text-stone-300 hover:text-rose-500 transition-colors',
                    editOptions.length <= 2 && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={addEditOption}
            className="w-full"
          >
            <Plus size={14} className="mr-2" />
            Optie toevoegen
          </Button>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setPollToEdit(null)
                setEditOptions([])
                setEditTitle('')
                setEditDescription('')
              }}
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              loading={updatePollDraft.isPending}
              disabled={
                !editTitle.trim() ||
                editOptions.filter((o) => o.label.trim()).length < 2
              }
            >
              Opslaan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

interface QuestionRowProps {
  question: Question
  onClose?: () => void
  onEditQuestion?: () => void
  onEditPoll?: () => void
  onDelete: () => void
}

function QuestionRow({ question, onClose, onEditQuestion, onEditPoll, onDelete }: QuestionRowProps) {
  const summary = calculateVoteSummary(question.votes ?? [])
  const result = getVoteResult(summary)
  const totalVotes = calculateTotalVotes(question)
  const hasVotes = (question.votes?.length ?? 0) > 0
  const canEditQuestion =
    question.status === 'open' &&
    !hasVotes
  const canEditPoll =
    question.question_type === 'poll' &&
    question.status === 'open' &&
    !hasVotes

  const resultLabels = {
    approved: 'Goedgekeurd',
    rejected: 'Afgewezen',
    no_majority: 'Geen meerderheid',
  }

  const resultVariants = {
    approved: 'success' as const,
    rejected: 'danger' as const,
    no_majority: 'default' as const,
  }

  return (
    <div className="bg-white border border-stone-200 p-4">
      {/* Question info */}
      <div className="flex-1 min-w-0 mb-3 md:mb-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant="primary">{question.groups?.name}</Badge>
          <span className="text-xs text-stone-400">{formatDate(question.created_at)}</span>
        </div>
        <h3 className="font-medium text-stone-800 break-words">{question.title}</h3>
        <p className="text-sm text-stone-500">
          {totalVotes} stemmen
          {question.status === 'completed' && (
            <> &bull; <Badge variant={resultVariants[result]}>{resultLabels[result]}</Badge></>
          )}
        </p>
      </div>

      {/* Action buttons - wrap on mobile, row on desktop */}
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-stone-100 md:border-0 md:pt-0 md:mt-3">
        {question.status === 'open' && onClose && (
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 md:flex-none min-h-[44px]">
            <XCircle size={14} className="mr-1.5" />
            Sluiten
          </Button>
        )}
        {canEditQuestion && onEditQuestion && (
          <Button variant="outline" size="sm" onClick={onEditQuestion} className="flex-1 md:flex-none min-h-[44px]">
            <Pencil size={14} className="mr-1.5" />
            Bewerk vraag
          </Button>
        )}
        {!canEditQuestion && question.status === 'open' && (
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Niet bewerkbaar zodra er stemmen zijn uitgebracht."
            className="flex-1 md:flex-none min-h-[44px]"
          >
            <Pencil size={14} className="mr-1.5" />
            Bewerk vraag
          </Button>
        )}
        {canEditPoll && onEditPoll && (
          <Button variant="outline" size="sm" onClick={onEditPoll} className="flex-1 md:flex-none min-h-[44px]">
            <Pencil size={14} className="mr-1.5" />
            Bewerk opties
          </Button>
        )}
        {!canEditPoll && question.question_type === 'poll' && question.status === 'open' && (
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Niet bewerkbaar zodra er stemmen zijn uitgebracht."
            className="flex-1 md:flex-none min-h-[44px]"
          >
            <Pencil size={14} className="mr-1.5" />
            Bewerk opties
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete} className="min-h-[44px] min-w-[44px]">
          <Trash2 size={14} className="text-rose-500" />
        </Button>
      </div>
    </div>
  )
}
