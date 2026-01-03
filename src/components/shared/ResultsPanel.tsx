import { motion } from 'framer-motion'
import type { VoteSummary, VoteResult } from '@/types'
import { getVoteResult } from '@/types'
import { cn } from '@/lib/utils'

interface ResultsPanelProps {
  summary: VoteSummary
}

const resultLabels: Record<VoteResult, string> = {
  approved: 'Goedgekeurd',
  rejected: 'Afgewezen',
  no_majority: 'Geen meerderheid',
}

const resultColors: Record<VoteResult, string> = {
  approved: 'text-emerald-600',
  rejected: 'text-rose-600',
  no_majority: 'text-stone-500',
}

const donutSegments = [
  {
    label: 'Akkoord',
    key: 'yes',
    color: 'stroke-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
  },
  {
    label: 'Niet akkoord',
    key: 'no',
    color: 'stroke-rose-500',
    dot: 'bg-rose-500',
    text: 'text-rose-600',
  },
  {
    label: 'Onthouding',
    key: 'abstain',
    color: 'stroke-stone-400',
    dot: 'bg-stone-400',
    text: 'text-stone-600',
  },
] as const

export function ResultsPanel({ summary }: ResultsPanelProps) {
  const total = summary.yes + summary.no + summary.abstain
  const result = getVoteResult(summary)

  return (
    <div className="space-y-5">
      {/* Result announcement - clear hierarchy */}
      <div className="text-center pb-4 border-b border-stone-100">
        <p className={cn('text-lg font-serif font-semibold', resultColors[result])}>
          {resultLabels[result]}
        </p>
        <p className="text-xs text-stone-400 mt-1">
          {total} {total === 1 ? 'stem' : 'stemmen'} uitgebracht
        </p>
      </div>

      {/* Donut chart with legend integrated */}
      <div className="flex items-center gap-5">
        <div className="relative w-24 h-24 flex-shrink-0">
          <DonutChart summary={summary} total={total} />
        </div>

        {/* Legend - vertical beside chart */}
        <div className="flex-1 space-y-2">
          {donutSegments.map((segment) => {
            const value = summary[segment.key]
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0

            return (
              <div key={segment.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('w-3 h-3 rounded-sm', segment.dot)} />
                  <span className="text-sm text-stone-600">{segment.label}</span>
                </div>
                <span className={cn('text-sm font-medium', segment.text)}>
                  {value}{' '}
                  <span className="text-stone-400 font-normal">({percentage}%)</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface DonutChartProps {
  summary: VoteSummary
  total: number
}

function DonutChart({ summary, total }: DonutChartProps) {
  let cumulative = 0

  return (
    <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
      <circle
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        className="text-stone-100"
      />
      {donutSegments.map((segment) => {
        const value = summary[segment.key]
        const percentage = total > 0 ? (value / total) * 100 : 0
        if (percentage === 0) return null

        const dashArray = `${percentage} ${100 - percentage}`
        const dashOffset = -cumulative
        cumulative += percentage

        return (
          <motion.circle
            key={segment.key}
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            className={segment.color}
            initial={{ strokeDasharray: '0 100' }}
            animate={{ strokeDasharray: dashArray }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        )
      })}
    </svg>
  )
}
