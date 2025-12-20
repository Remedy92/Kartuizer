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

export function ResultsPanel({ summary }: ResultsPanelProps) {
  const total = summary.yes + summary.no + summary.abstain
  const result = getVoteResult(summary)

  return (
    <div className="py-2">
      <p className={cn('text-sm font-medium mb-4 text-center lg:text-left', resultColors[result])}>
        {resultLabels[result]}
      </p>

      <div className="space-y-3">
        <ResultRow label="Akkoord" value={summary.yes} total={total} color="bg-emerald-500" />
        <ResultRow label="Niet akkoord" value={summary.no} total={total} color="bg-rose-500" />
        <ResultRow label="Onthouding" value={summary.abstain} total={total} color="bg-stone-400" />
      </div>
    </div>
  )
}

interface ResultRowProps {
  label: string
  value: number
  total: number
  color: string
}

function ResultRow({ label, value, total, color }: ResultRowProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0

  return (
    <div>
      <div className="flex justify-between text-xs text-stone-500 mb-1">
        <span>{label}</span>
        <span className="font-medium text-stone-700">{value}</span>
      </div>
      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
