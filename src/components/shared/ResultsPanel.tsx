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
    bar: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400',
    text: 'text-emerald-600',
  },
  {
    label: 'Niet akkoord',
    key: 'no',
    color: 'stroke-rose-500',
    bar: 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400',
    text: 'text-rose-600',
  },
  {
    label: 'Onthouding',
    key: 'abstain',
    color: 'stroke-stone-400',
    bar: 'bg-gradient-to-r from-stone-500 via-stone-400 to-stone-300',
    text: 'text-stone-600',
  },
] as const

export function ResultsPanel({ summary }: ResultsPanelProps) {
  const total = summary.yes + summary.no + summary.abstain
  const result = getVoteResult(summary)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20">
          <DonutChart summary={summary} total={total} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-wider text-stone-400">Totaal</span>
            <span className="text-sm font-semibold text-stone-800">{total}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold', resultColors[result])}>{resultLabels[result]}</p>
          <p className="text-xs text-stone-500 mt-1">
            Resultaat op basis van {total} {total === 1 ? 'stem' : 'stemmen'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {donutSegments.map((segment) => (
          <ResultRow
            key={segment.key}
            label={segment.label}
            value={summary[segment.key]}
            total={total}
            bar={segment.bar}
            text={segment.text}
          />
        ))}
      </div>
    </div>
  )
}

interface ResultRowProps {
  label: string
  value: number
  total: number
  bar: string
  text: string
}

function ResultRow({ label, value, total, bar, text }: ResultRowProps) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="rounded-md p-2">
      <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
        <span className="font-medium text-stone-700">{label}</span>
        <span className={cn('font-semibold', text)}>{percentage}%</span>
      </div>
      <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', bar)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
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
        const dashArray = `${percentage} ${100 - percentage}`
        const dashOffset = -cumulative
        cumulative += percentage

        return (
          <circle
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
          />
        )
      })}
    </svg>
  )
}
