import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import type { Question, Vote, VoteType } from '@/types'
import { VoteButton } from './VoteButton'

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

export function VotingPanel({ question, userVote, isVoting, onVote }: VotingPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const decidedResult = question.decided_result

  // User has voted and is not editing - show current vote with edit option
  // Note: userVote.vote can be null for poll votes, but this panel is only for standard votes
  if (userVote && userVote.vote && !isEditing) {
    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5 text-emerald-600" />
        </div>
        <p className="text-sm font-medium text-stone-700 mb-1">Stem uitgebracht</p>
        <p className="text-xs text-stone-500">{voteLabels[userVote.vote]}</p>

        {/* Show majority status if decided */}
        {decidedResult && (
          <p className="text-xs text-amber-600 mt-2 font-medium">
            Meerderheid bereikt: {decidedLabels[decidedResult]}
          </p>
        )}

        <p className="text-xs text-stone-400 mt-3">
          {question.votes?.length || 0} / {question.groups?.required_votes} stemmen
        </p>

        {/* Edit button */}
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

  // Show voting buttons (for initial vote or when editing)
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
