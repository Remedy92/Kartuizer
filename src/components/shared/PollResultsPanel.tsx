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

  const sortedOptions = useMemo(
    () => [...summary.options].sort((a, b) => b.vote_count - a.vote_count),
    [summary.options]
  )

  return (
    <div className="space-y-5">
      {/* Winner announcement */}
      {summary.winner && (() => {
        const isUnanimous = summary.winner.vote_count === summary.total_votes
        return (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200/60 rounded-md"
          >
            <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-amber-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">
                {isUnanimous ? 'Unaniem' : 'Winnaar'}
              </p>
              <p className="text-base font-medium text-amber-900 truncate">{summary.winner.label}</p>
            </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-semibold text-amber-800">
              {summary.total_votes > 0 && summary.winner.vote_count
                ? Math.round((summary.winner.vote_count / summary.total_votes) * 100)
                : 0}
              %
            </p>
            <p className="text-xs text-amber-600">{summary.winner.vote_count ?? 0} stemmen</p>
          </div>
        </motion.div>
        )
      })()}

      {/* All results - prominent bars */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
          Alle resultaten
        </p>

        <div className="space-y-3">
          {sortedOptions.map((item, index) => {
            // Only highlight as winner if there's actually a winner (not a tie)
            const isWinner = summary.winner && item.option.id === summary.winner.id

            return (
              <motion.div
                key={item.option.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isWinner ? 'text-primary-800' : 'text-stone-600'
                    )}
                  >
                    {item.option.label}
                  </span>
                  <span
                    className={cn(
                      'text-sm',
                      isWinner ? 'text-primary-600 font-semibold' : 'text-stone-500'
                    )}
                  >
                    {item.vote_count} ({item.percentage}%)
                  </span>
                </div>

                <div className="h-4 rounded-sm bg-stone-100 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={cn(
                      'h-full rounded-sm',
                      isWinner
                        ? 'bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400'
                        : 'bg-stone-300'
                    )}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-center gap-2 pt-3 border-t border-stone-100 text-xs text-stone-500">
        <Users className="w-3.5 h-3.5" />
        <span>
          {summary.total_voters} {summary.total_voters === 1 ? 'stemmer' : 'stemmers'} ·{' '}
          {summary.total_votes} stemmen
        </span>
      </div>
    </div>
  )
}
