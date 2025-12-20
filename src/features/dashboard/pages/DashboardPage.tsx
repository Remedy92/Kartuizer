import { useState } from 'react'
import { Circle, Loader2 } from 'lucide-react'
import { useOpenQuestions, useVote } from '@/hooks'
import { useAuthStore } from '@/stores'
import { useToast } from '@/hooks'
import { QuestionCard } from '@/components/shared'
import type { VoteType, Vote } from '@/types'

export function DashboardPage() {
  const { data: questions, isLoading, error } = useOpenQuestions()
  const voteMutation = useVote()
  const session = useAuthStore((s) => s.session)
  const { error: showError } = useToast()
  const [votingQuestionId, setVotingQuestionId] = useState<string | null>(null)

  const handleVote = async (questionId: string, vote: VoteType) => {
    if (votingQuestionId) return

    setVotingQuestionId(questionId)
    try {
      await voteMutation.mutateAsync({ questionId, vote })
    } catch (err) {
      showError('Stem mislukt', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setVotingQuestionId(null)
    }
  }

  const getUserVote = (votes: Vote[] | undefined): Vote | undefined => {
    if (!session?.user?.id || !votes) return undefined
    return votes.find((v) => v.user_id === session.user.id)
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-rose-600">Er is een fout opgetreden bij het laden van de vragen.</p>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-stone-800 mb-3">
              Openstaande Vragen
            </h1>
            <p className="text-stone-500 max-w-lg">
              Breng uw stem uit op actuele agendapunten.
            </p>
          </div>

          {questions && questions.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Circle size={8} className="fill-emerald-500 text-emerald-500" />
              <span>{questions.length} actief</span>
            </div>
          )}
        </div>
        <div className="h-px bg-gradient-to-r from-stone-200 via-stone-200 to-transparent mt-8" />
      </header>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : !questions || questions.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-stone-300 to-transparent mx-auto mb-6" />
          <p className="text-stone-400 italic">Geen openstaande vragen</p>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              userVote={getUserVote(question.votes)}
              isVoting={votingQuestionId === question.id}
              onVote={(vote) => handleVote(question.id, vote)}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  )
}
