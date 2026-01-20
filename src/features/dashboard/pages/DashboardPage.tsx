import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Circle, Loader2, Plus } from 'lucide-react'
import { useOpenQuestions, useVote, usePollVote, useMultiPollVote } from '@/hooks'
import { useAuthStore } from '@/stores'
import { useToast } from '@/hooks'
import { supabaseUrl } from '@/lib/supabase'
import { QuestionCard } from '@/components/shared'
import { Button } from '@/components/ui'
import type { VoteType, Vote } from '@/types'

export function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: questions, isLoading, error } = useOpenQuestions()
  const voteMutation = useVote()
  const pollVoteMutation = usePollVote()
  const multiPollVoteMutation = useMultiPollVote()
  const session = useAuthStore((s) => s.session)
  const { error: showError } = useToast()
  const [votingQuestionId, setVotingQuestionId] = useState<string | null>(null)
  const [showSlowLoading, setShowSlowLoading] = useState(false)

  const lastErrorRef = useRef<string | null>(null)

  useEffect(() => {
    if (!error) {
      lastErrorRef.current = null
      return
    }

    const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
    if (lastErrorRef.current === message) return
    lastErrorRef.current = message
    showError('Vragen laden mislukt', message)
  }, [error, showError])

  useEffect(() => {
    if (!isLoading) {
      setShowSlowLoading(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowSlowLoading(true)
    }, 6000)

    return () => window.clearTimeout(timeoutId)
  }, [isLoading])

	  // Scroll to question from URL parameter
	  useEffect(() => {
	    const questionId = searchParams.get('questionId')
	    if (!questionId || isLoading) return

	    let highlightTimeout: ReturnType<typeof setTimeout> | undefined

	    // Wait for questions to render, then scroll
	    const scrollTimeout = window.setTimeout(() => {
	      const element = document.getElementById(`question-${questionId}`)
	      if (element) {
	        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
	        // Add highlight effect (card already has transition-all)
	        element.style.boxShadow = '0 0 0 3px rgba(120, 53, 15, 0.3)'

        // Remove highlight after 2 seconds
        highlightTimeout = window.setTimeout(() => {
          element.style.boxShadow = ''
        }, 2000)

        // Clean up query parameter (only remove questionId)
        const nextParams = new URLSearchParams(searchParams)
        nextParams.delete('questionId')
        setSearchParams(nextParams, { replace: true })
      }
	    }, 100)

	    return () => {
	      window.clearTimeout(scrollTimeout)
	      if (highlightTimeout) window.clearTimeout(highlightTimeout)
	    }
	  }, [isLoading, searchParams, setSearchParams])

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

  const handlePollVote = async (questionId: string, optionId: string) => {
    if (votingQuestionId) return

    setVotingQuestionId(questionId)
    try {
      await pollVoteMutation.mutateAsync({ questionId, optionId })
    } catch (err) {
      showError('Stem mislukt', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setVotingQuestionId(null)
    }
  }

  const handleMultiPollVote = async (questionId: string, optionIds: string[]) => {
    if (votingQuestionId) return

    setVotingQuestionId(questionId)
    try {
      await multiPollVoteMutation.mutateAsync({ questionId, optionIds })
    } catch (err) {
      showError('Stem mislukt', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setVotingQuestionId(null)
    }
  }

  const getUserVote = (votes: Vote[] | undefined): Vote | undefined => {
    if (!session?.user?.id || !votes) return undefined
    // For standard votes, find the vote with a vote type (not poll_option_id)
    return votes.find((v) => v.user_id === session.user.id && v.vote !== null)
  }

  const getUserPollVotes = (votes: Vote[] | undefined): Vote[] => {
    if (!session?.user?.id || !votes) return []
    // For poll votes, find all votes with poll_option_id
    return votes.filter((v) => v.user_id === session.user.id && v.poll_option_id)
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-rose-600">Er is een fout opgetreden bij het laden van de vragen.</p>
        <p className="text-sm text-rose-500 mt-2">
          {error instanceof Error ? error.message : 'Controleer je rechten en de Supabase-verbinding.'}
        </p>
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

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Button variant="primary" onClick={() => navigate('/questions/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Nieuw agendapunt
            </Button>

            {questions && questions.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <Circle size={8} className="fill-emerald-500 text-emerald-500" />
                <span>{questions.length} actief</span>
              </div>
            )}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-stone-200 via-stone-200 to-transparent mt-8" />
      </header>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
          {showSlowLoading && (
            <div className="text-center text-sm text-stone-500 max-w-md">
              <p>Dit duurt langer dan verwacht.</p>
              <p className="mt-2">
                Controleer of Supabase bereikbaar is en of je `.env` klopt.
              </p>
              {supabaseUrl && (
                <p className="mt-2 text-xs text-stone-400">
                  Supabase URL: {supabaseUrl}
                </p>
              )}
            </div>
          )}
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
              userPollVotes={getUserPollVotes(question.votes)}
              isVoting={votingQuestionId === question.id}
              onVote={(vote) => handleVote(question.id, vote)}
              onPollVote={(optionId) => handlePollVote(question.id, optionId)}
              onMultiPollVote={(optionIds) => handleMultiPollVote(question.id, optionIds)}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  )
}
