import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import type { Question, Vote, VoteType, VoteSummary } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { calculateVoteSummary } from '@/types'
import { Badge } from '@/components/ui'
import { Countdown } from '@/components/ui'
import { VotingPanel } from './VotingPanel'
import { ResultsPanel } from './ResultsPanel'
import { PollVotingPanel } from './PollVotingPanel'
import { PollResultsPanel } from './PollResultsPanel'

interface QuestionCardProps {
  question: Question
  userVote?: Vote
  userPollVotes?: Vote[]
  isVoting?: boolean
  onVote?: (vote: VoteType) => void
  onPollVote?: (optionId: string) => void
  onMultiPollVote?: (optionIds: string[]) => void
  index?: number
}

export function QuestionCard({
  question,
  userVote,
  userPollVotes = [],
  isVoting = false,
  onVote,
  onPollVote,
  onMultiPollVote,
  index = 0,
}: QuestionCardProps) {
  const isPoll = question.question_type === 'poll'
  const summary: VoteSummary = calculateVoteSummary(question.votes ?? [])

  // Render the appropriate voting/results panel
  const renderVotingSection = () => {
    if (question.status === 'open') {
      if (isPoll && onPollVote && onMultiPollVote) {
        return (
          <PollVotingPanel
            question={question}
            userVotes={userPollVotes}
            isVoting={isVoting}
            onVote={onPollVote}
            onMultiVote={onMultiPollVote}
          />
        )
      } else if (!isPoll && onVote) {
        return (
          <VotingPanel
            question={question}
            userVote={userVote}
            isVoting={isVoting}
            onVote={onVote}
          />
        )
      }
    }

    // Closed question - show results
    if (isPoll) {
      return <PollResultsPanel question={question} />
    }
    return <ResultsPanel summary={summary} />
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white border border-stone-200/80 shadow-sm shadow-stone-200/50 hover:border-stone-300 transition-all duration-300 hover:shadow-md hover:shadow-stone-200/60"
    >
      {/* Header with metadata */}
      <div className="px-6 pt-6 pb-4 border-b border-stone-100">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="primary">{question.groups?.name}</Badge>
          {isPoll && (
            <Badge variant="default">
              <BarChart3 className="w-3 h-3 mr-1 inline" />
              Poll
            </Badge>
          )}
          {question.status === 'open' && question.decided_result && (
            <Badge variant="decided">
              {question.decided_result === 'yes' ? 'Besloten: Goedgekeurd' : 'Besloten: Afgewezen'}
            </Badge>
          )}
          <span className="text-xs text-stone-400 ml-auto">
            {formatDate(question.created_at)}
          </span>
          {question.deadline && question.status === 'open' && (
            <Countdown deadline={question.deadline} />
          )}
        </div>

        <h2
          className={cn(
            'text-xl font-serif text-stone-800 leading-snug',
            'group-hover:text-primary-800 transition-colors'
          )}
        >
          {question.title}
        </h2>

        {question.description && (
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">{question.description}</p>
        )}
      </div>

      {/* Voting section - full width, unified */}
      <div className="p-6">
        {renderVotingSection()}
      </div>
    </motion.article>
  )
}
