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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white border border-stone-200 hover:border-stone-300 transition-all duration-300 hover:shadow-lg hover:shadow-stone-100"
    >
      <div className="p-8 flex flex-col lg:flex-row gap-8">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-4">
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
            {question.status === 'open' && isPoll && question.winning_option_id && (
              <Badge variant="decided">
                Koploper: {question.poll_options?.find(o => o.id === question.winning_option_id)?.label}
              </Badge>
            )}
            <span className="text-xs text-stone-400">
              {formatDate(question.created_at)}
            </span>
            {question.deadline && question.status === 'open' && (
              <Countdown deadline={question.deadline} />
            )}
          </div>

          <h2
            className={cn(
              'text-xl md:text-2xl font-serif text-stone-800 mb-3',
              'group-hover:text-primary-800 transition-colors'
            )}
          >
            {question.title}
          </h2>

          {question.description && (
            <p className="text-stone-500 leading-relaxed">{question.description}</p>
          )}

          {/* Show poll options preview for polls */}
          {isPoll && question.poll_options && question.poll_options.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {question.poll_options
                .sort((a, b) => a.sort_order - b.sort_order)
                .slice(0, 4)
                .map((option) => (
                  <span
                    key={option.id}
                    className="inline-flex items-center px-2 py-1 bg-stone-100 text-xs text-stone-600"
                  >
                    {option.label}
                  </span>
                ))}
              {question.poll_options.length > 4 && (
                <span className="inline-flex items-center px-2 py-1 text-xs text-stone-400">
                  +{question.poll_options.length - 4} meer
                </span>
              )}
            </div>
          )}
        </div>

        {/* Voting Section */}
        <div className={cn(
          'flex-shrink-0 lg:border-l lg:border-stone-100 lg:pl-8',
          isPoll ? 'lg:w-72' : 'lg:w-56'
        )}>
          {renderVotingSection()}
        </div>
      </div>
    </motion.div>
  )
}
