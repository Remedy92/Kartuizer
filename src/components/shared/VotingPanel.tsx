import { Check } from 'lucide-react'
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

export function VotingPanel({ question, userVote, isVoting, onVote }: VotingPanelProps) {
  if (userVote) {
    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5 text-emerald-600" />
        </div>
        <p className="text-sm font-medium text-stone-700 mb-1">Stem uitgebracht</p>
        <p className="text-xs text-stone-500">{voteLabels[userVote.vote]}</p>
        <p className="text-xs text-stone-400 mt-3">
          {question.votes?.length || 0} / {question.groups?.required_votes} stemmen
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-400 uppercase tracking-wider mb-4 text-center lg:text-left">
        Uw stem
      </p>
      <VoteButton variant="yes" onClick={() => onVote('yes')} disabled={isVoting} loading={isVoting} />
      <VoteButton variant="no" onClick={() => onVote('no')} disabled={isVoting} loading={isVoting} />
      <VoteButton variant="abstain" onClick={() => onVote('abstain')} disabled={isVoting} loading={isVoting} />
    </div>
  )
}
