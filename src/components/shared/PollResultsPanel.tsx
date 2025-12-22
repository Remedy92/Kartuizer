import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Users } from 'lucide-react'
import type { Question } from '@/types'
import { calculatePollSummary } from '@/types'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui'

interface PollResultsPanelProps {
  question: Question
}

const neutralBars = [
  'bg-gradient-to-r from-stone-400 via-stone-300 to-stone-200',
  'bg-gradient-to-r from-stone-500 via-stone-400 to-stone-300',
  'bg-gradient-to-r from-stone-300 via-stone-200 to-stone-100',
  'bg-gradient-to-r from-stone-600 via-stone-500 to-stone-400',
]

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

  const maxVotes = sortedOptions[0]?.vote_count || 0
  const totalVotes = summary.total_votes

  const rankMap = useMemo(() => {
    const map = new Map<string, number>()
    sortedOptions.forEach((item, index) => map.set(item.option.id, index + 1))
    return map
  }, [sortedOptions])

  return (
    <div className="space-y-4">
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

      <div className="rounded-lg border border-stone-200 bg-stone-50/70 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-stone-500">Verdeling</span>
          <span className="text-xs text-stone-500">
            {summary.total_voters} {summary.total_voters === 1 ? 'stemmer' : 'stemmers'}
          </span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-stone-100 overflow-hidden flex">
          {totalVotes === 0 ? (
            <div className="h-full w-full bg-stone-200/70" />
          ) : (
            sortedOptions.map((item, index) => {
              const width = totalVotes > 0 ? (item.vote_count / totalVotes) * 100 : 0
              const isWinner = item.option.id === question.winning_option_id
              const barClass = isWinner
                ? 'bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400'
                : neutralBars[index % neutralBars.length]

              return (
                <div
                  key={item.option.id}
                  className="h-full"
                  style={{ width: `${width}%` }}
                >
                  <Tooltip
                    className="h-full w-full"
                    content={
                      <div className="flex items-center gap-2">
                        <span className={cn('font-medium', isWinner ? 'text-primary-200' : '')}>
                          {item.option.label}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span>{item.vote_count} {item.vote_count === 1 ? 'stem' : 'stemmen'}</span>
                        <span className="text-stone-300">•</span>
                        <span>{item.percentage}%</span>
                      </div>
                    }
                  >
                    <div className={cn('h-full w-full', barClass)} />
                  </Tooltip>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="space-y-3">
        {sortedOptions.map((item, index) => {
          const isWinner = item.option.id === question.winning_option_id
          const barWidth = maxVotes > 0 ? (item.vote_count / maxVotes) * 100 : 0
          const rank = rankMap.get(item.option.id)

          return (
            <Tooltip
              key={item.option.id}
              className="block"
              align="start"
              content={
                <div className="flex items-center gap-2">
                  <span className={cn('font-medium', isWinner ? 'text-primary-200' : '')}>
                    {item.option.label}
                  </span>
                  <span className="text-stone-300">•</span>
                  <span>{item.vote_count} {item.vote_count === 1 ? 'stem' : 'stemmen'}</span>
                  <span className="text-stone-300">•</span>
                  <span>{item.percentage}%</span>
                  {rank ? (
                    <>
                      <span className="text-stone-300">•</span>
                      <span>#{rank}</span>
                    </>
                  ) : null}
                </div>
              }
            >
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="space-y-1.5 rounded-md p-2 transition-colors hover:bg-stone-50"
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

                <div className="h-2.5 bg-stone-100 overflow-hidden rounded-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.6, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      'h-full',
                      isWinner
                        ? 'bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400'
                        : neutralBars[index % neutralBars.length]
                    )}
                  />
                </div>
              </motion.div>
            </Tooltip>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-stone-500">
        <Users className="w-3.5 h-3.5" />
        <span>
          {summary.total_voters} {summary.total_voters === 1 ? 'stem' : 'stemmen'} uitgebracht
        </span>
      </div>
    </div>
  )
}
