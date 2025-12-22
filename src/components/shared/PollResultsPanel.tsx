import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Users } from 'lucide-react'
import type { Question } from '@/types'
import { calculatePollSummary } from '@/types'
import { cn } from '@/lib/utils'

interface PollResultsPanelProps {
  question: Question
}

export function PollResultsPanel({ question }: PollResultsPanelProps) {
  const summary = useMemo(
    () =>
      calculatePollSummary(
        question.poll_options ?? [],
        question.votes ?? [],
        question.winning_option_id
      ),
    [question.poll_options, question.votes, question.winning_option_id]
  )

  // Sort by vote count descending
  const sortedOptions = useMemo(
    () => [...summary.options].sort((a, b) => b.vote_count - a.vote_count),
    [summary.options]
  )

  const maxVotes = sortedOptions[0]?.vote_count || 0

  return (
    <div className="space-y-4">
      {/* Winner banner */}
      {summary.winner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200"
        >
          <Trophy className="w-4 h-4 text-amber-600" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">Winnaar</p>
            <p className="text-sm font-medium text-amber-900 truncate">{summary.winner.label}</p>
          </div>
        </motion.div>
      )}

      {/* Results bars */}
      <div className="space-y-3">
        {sortedOptions.map((item, index) => {
          const isWinner = item.option.id === question.winning_option_id
          const barWidth = maxVotes > 0 ? (item.vote_count / maxVotes) * 100 : 0

          return (
            <motion.div
              key={item.option.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between text-sm">
                <span
                  className={cn(
                    'font-medium truncate',
                    isWinner ? 'text-primary-800' : 'text-stone-700'
                  )}
                >
                  {item.option.label}
                </span>
                <span
                  className={cn(
                    'text-xs flex-shrink-0 ml-2',
                    isWinner ? 'text-primary-600 font-medium' : 'text-stone-500'
                  )}
                >
                  {item.vote_count} ({item.percentage}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-stone-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className={cn('h-full', isWinner ? 'bg-primary-600' : 'bg-stone-400')}
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Total voters */}
      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-stone-500">
        <Users className="w-3.5 h-3.5" />
        <span>
          {summary.total_voters} {summary.total_voters === 1 ? 'stem' : 'stemmen'} uitgebracht
        </span>
      </div>
    </div>
  )
}
