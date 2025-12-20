import { motion } from 'framer-motion'
import type { Question, Vote, VoteType, VoteSummary } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { calculateVoteSummary } from '@/types'
import { Badge } from '@/components/ui'
import { Countdown } from '@/components/ui'
import { VotingPanel } from './VotingPanel'
import { ResultsPanel } from './ResultsPanel'

interface QuestionCardProps {
  question: Question
  userVote?: Vote
  isVoting?: boolean
  onVote?: (vote: VoteType) => void
  index?: number
}

export function QuestionCard({
  question,
  userVote,
  isVoting = false,
  onVote,
  index = 0,
}: QuestionCardProps) {
  const summary: VoteSummary = calculateVoteSummary(question.votes ?? [])

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
        </div>

        {/* Voting Section */}
        <div className="lg:w-56 flex-shrink-0 lg:border-l lg:border-stone-100 lg:pl-8">
          {question.status === 'open' && onVote ? (
            <VotingPanel
              question={question}
              userVote={userVote}
              isVoting={isVoting}
              onVote={onVote}
            />
          ) : (
            <ResultsPanel summary={summary} />
          )}
        </div>
      </div>
    </motion.div>
  )
}
