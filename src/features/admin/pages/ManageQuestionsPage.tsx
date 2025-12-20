import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Loader2, CheckCircle, Clock, Trash2, XCircle } from 'lucide-react'
import { useAllQuestions, useCloseQuestion, useDeleteQuestion } from '@/hooks'
import { useToast } from '@/hooks'
import { Button, Badge, Modal } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { calculateVoteSummary, getVoteResult } from '@/types'
import type { Question } from '@/types'

export function ManageQuestionsPage() {
  const { data: questions, isLoading } = useAllQuestions()
  const closeQuestion = useCloseQuestion()
  const deleteQuestion = useDeleteQuestion()
  const { success, error: showError } = useToast()

  const [questionToClose, setQuestionToClose] = useState<Question | null>(null)
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null)

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
    </div>
  )
}

interface QuestionRowProps {
  question: Question
  onClose?: () => void
  onDelete: () => void
}

function QuestionRow({ question, onClose, onDelete }: QuestionRowProps) {
  const summary = calculateVoteSummary(question.votes ?? [])
  const result = getVoteResult(summary)
  const totalVotes = summary.yes + summary.no + summary.abstain

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
    <div className="bg-white border border-stone-200 p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="primary">{question.groups?.name}</Badge>
          <span className="text-xs text-stone-400">{formatDate(question.created_at)}</span>
        </div>
        <h3 className="font-medium text-stone-800 truncate">{question.title}</h3>
        <p className="text-sm text-stone-500">
          {totalVotes} stemmen
          {question.status === 'completed' && (
            <> &bull; <Badge variant={resultVariants[result]}>{resultLabels[result]}</Badge></>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {question.status === 'open' && onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            <XCircle size={14} className="mr-1.5" />
            Sluiten
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 size={14} className="text-rose-500" />
        </Button>
      </div>
    </div>
  )
}
