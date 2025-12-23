import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Pencil } from 'lucide-react'
import type { Question, Vote, VoteType } from '@/types'
import { VoteButton } from './VoteButton'
import { VotersList } from './VotersList'
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
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
  },
  {
    key: 'no',
    label: 'Niet akkoord',
    bar: 'bg-rose-500',
    dot: 'bg-rose-500',
    text: 'text-rose-600',
  },
  {
    key: 'abstain',
    label: 'Onthouding',
    bar: 'bg-stone-400',
    dot: 'bg-stone-400',
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
  const requiredVotes = question.groups?.required_votes || 1
  const quorumPercentage = Math.min((totalVotes / requiredVotes) * 100, 100)

  // Voted state - clear hierarchy with chunky visualization
  if (userVote && userVote.vote && !isEditing) {
    return (
      <div className="space-y-5">
        {/* Your Vote - Clear focal point */}
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Uw stem</p>
            <p className="text-sm font-medium text-stone-800">{voteLabels[userVote.vote]}</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-stone-400 hover:text-primary-600 transition-colors flex items-center gap-1"
          >
            <Pencil size={11} />
            Wijzigen
          </button>
        </div>

        {/* Majority reached notification */}
        {decidedResult && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200/60 rounded-md">
            <span className="text-xs font-medium text-amber-700">
              Meerderheid bereikt: {decidedLabels[decidedResult]}
            </span>
          </div>
        )}

        {/* Results Visualization - Substantial chunky bar */}
        {totalVotes > 0 && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Tussenstand
              </span>
              <span className="text-xs text-stone-400">
                {totalVotes} van {requiredVotes} stemmen
              </span>
            </div>

            {/* Chunky segmented bar */}
            <div className="h-5 rounded-md bg-stone-100 overflow-hidden flex">
              {segments.map((segment) => {
                const value = voteSummary[segment.key]
                const percentage = totalVotes > 0 ? (value / totalVotes) * 100 : 0
                if (percentage === 0) return null

                return (
                  <motion.div
                    key={segment.key}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className={cn('h-full first:rounded-l-md last:rounded-r-md', segment.bar)}
                  />
                )
              })}
            </div>

            {/* Legend - inline, compact */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {segments.map((segment) => {
                const value = voteSummary[segment.key]
                const percentage = totalVotes > 0 ? Math.round((value / totalVotes) * 100) : 0
                if (value === 0) return null

                return (
                  <div key={segment.key} className="flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-sm', segment.dot)} />
                    <span className="text-stone-600">{segment.label}</span>
                    <span className="text-stone-400">{percentage}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quorum progress - subtle indicator */}
        <div className="pt-3 border-t border-stone-100">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
            <span>Quorum voortgang</span>
            <span>{totalVotes} / {requiredVotes}</span>
          </div>
          <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${quorumPercentage}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-primary-400"
            />
          </div>
        </div>

        {/* Voters list - show who voted what */}
        {totalVotes > 0 && (
          <div className="pt-3 border-t border-stone-100">
            <VotersList votes={question.votes ?? []} variant="standard" />
          </div>
        )}
      </div>
    )
  }

  // Voting state - options to cast vote
  const handleVote = (vote: VoteType) => {
    onVote(vote)
    setIsEditing(false)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-stone-500 uppercase tracking-wide">
        {isEditing ? 'Wijzig uw stem' : 'Breng uw stem uit'}
      </p>

      {/* Vote buttons */}
      <div className="grid gap-2">
        <VoteButton
          variant="yes"
          onClick={() => handleVote('yes')}
          disabled={isVoting}
          loading={isVoting}
          selected={userVote?.vote === 'yes'}
          percentage={totalVotes > 0 ? (voteSummary.yes / totalVotes) * 100 : undefined}
        />
        <VoteButton
          variant="no"
          onClick={() => handleVote('no')}
          disabled={isVoting}
          loading={isVoting}
          selected={userVote?.vote === 'no'}
          percentage={totalVotes > 0 ? (voteSummary.no / totalVotes) * 100 : undefined}
        />
        <VoteButton
          variant="abstain"
          onClick={() => handleVote('abstain')}
          disabled={isVoting}
          loading={isVoting}
          selected={userVote?.vote === 'abstain'}
          percentage={totalVotes > 0 ? (voteSummary.abstain / totalVotes) * 100 : undefined}
        />
      </div>

      {/* Voter count - minimal */}
      <p className="text-xs text-stone-400 text-center pt-2">
        {totalVotes} van {requiredVotes} stemmen uitgebracht
      </p>

      {isEditing && (
        <button
          onClick={() => setIsEditing(false)}
          className="w-full text-xs text-stone-400 hover:text-stone-600 py-2 transition-colors"
        >
          Annuleren
        </button>
      )}
    </div>
  )
}
