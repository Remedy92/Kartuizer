import { useMemo, useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import type { Question, Vote, VoteType } from '@/types'
import { VoteButton } from './VoteButton'
import { cn } from '@/lib/utils'

interface VotingPanelProps {
  question: Question
  userVote?: Vote
  isVoting: boolean
  onVote: (vote: VoteType) => void
}

const voteLabels = {
  yes: 'Akkoord',
  no: 'Niet akkoord',
  abstain: 'Onthouding',
}

const decidedLabels = {
  yes: 'Goedgekeurd',
  no: 'Afgewezen',
}

const segments = [
  {
    key: 'yes',
    label: 'Akkoord',
    bar: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400',
    text: 'text-emerald-600',
  },
  {
    key: 'no',
    label: 'Niet akkoord',
    bar: 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400',
    text: 'text-rose-600',
  },
  {
    key: 'abstain',
    label: 'Onthouding',
    bar: 'bg-gradient-to-r from-stone-500 via-stone-400 to-stone-300',
    text: 'text-stone-600',
  },
] as const

export function VotingPanel({ question, userVote, isVoting, onVote }: VotingPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const decidedResult = question.decided_result

  const voteSummary = useMemo(() => {
    const summary = { yes: 0, no: 0, abstain: 0 }
    for (const vote of question.votes ?? []) {
      if (vote.vote) {
        summary[vote.vote] = (summary[vote.vote] || 0) + 1
      }
    }
    return summary
  }, [question.votes])

  const totalVotes = voteSummary.yes + voteSummary.no + voteSummary.abstain

  const renderDistribution = () => {
    if (totalVotes === 0) return null

    return (
      <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50/70 p-3">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-stone-500">
          <span>Tussenstand</span>
          <span>{totalVotes} stemmen</span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-stone-100 overflow-hidden flex">
          {segments.map((segment) => {
            const value = voteSummary[segment.key]
            const percentage = totalVotes > 0 ? (value / totalVotes) * 100 : 0

            return (
              <div
                key={segment.key}
                className={cn('h-full', segment.bar)}
                style={{ width: `${percentage}%` }}
              />
            )
          })}
        </div>
      </div>
    )
  }

  if (userVote && userVote.vote && !isEditing) {
    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5 text-emerald-600" />
        </div>
        <p className="text-sm font-medium text-stone-700 mb-1">Stem uitgebracht</p>
        <p className="text-xs text-stone-500">{voteLabels[userVote.vote]}</p>

        {decidedResult && (
          <p className="text-xs text-amber-600 mt-2 font-medium">
            Meerderheid bereikt: {decidedLabels[decidedResult]}
          </p>
        )}

        {renderDistribution()}

        <p className="text-xs text-stone-400 mt-3">
          {totalVotes} / {question.groups?.required_votes} stemmen
        </p>

        <button
          onClick={() => setIsEditing(true)}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700"
        >
          <Pencil size={12} />
          <span>Stem wijzigen</span>
        </button>
      </div>
    )
  }

  const handleVote = (vote: VoteType) => {
    onVote(vote)
    setIsEditing(false)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-400 uppercase tracking-wider mb-4 text-center lg:text-left">
        {isEditing ? 'Wijzig uw stem' : 'Uw stem'}
      </p>
      <VoteButton
        variant="yes"
        onClick={() => handleVote('yes')}
        disabled={isVoting}
        loading={isVoting}
        selected={userVote?.vote === 'yes'}
      />
      <VoteButton
        variant="no"
        onClick={() => handleVote('no')}
        disabled={isVoting}
        loading={isVoting}
        selected={userVote?.vote === 'no'}
      />
      <VoteButton
        variant="abstain"
        onClick={() => handleVote('abstain')}
        disabled={isVoting}
        loading={isVoting}
        selected={userVote?.vote === 'abstain'}
      />

      {renderDistribution()}

      {isEditing && (
        <button
          onClick={() => setIsEditing(false)}
          className="w-full text-xs text-stone-400 hover:text-stone-600 mt-2 py-2"
        >
          Annuleren
        </button>
      )}
    </div>
  )
}
