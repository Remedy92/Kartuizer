import { motion } from 'framer-motion'
import { Check, X, Minus, Loader2 } from 'lucide-react'
import type { VoteType } from '@/types'
import { cn } from '@/lib/utils'

interface VoteButtonProps {
  variant: VoteType
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  selected?: boolean
  percentage?: number
}

const config = {
  yes: {
    label: 'Akkoord',
    icon: Check,
    base: 'border-emerald-200 hover:border-emerald-300',
    selected: 'border-emerald-500 bg-emerald-50',
    indicator: 'bg-emerald-500',
    bar: 'bg-emerald-100',
    text: 'text-emerald-700',
  },
  no: {
    label: 'Niet akkoord',
    icon: X,
    base: 'border-rose-200 hover:border-rose-300',
    selected: 'border-rose-500 bg-rose-50',
    indicator: 'bg-rose-500',
    bar: 'bg-rose-100',
    text: 'text-rose-700',
  },
  abstain: {
    label: 'Onthouding',
    icon: Minus,
    base: 'border-stone-200 hover:border-stone-300',
    selected: 'border-stone-400 bg-stone-50',
    indicator: 'bg-stone-400',
    bar: 'bg-stone-100',
    text: 'text-stone-700',
  },
}

export function VoteButton({ variant, onClick, disabled, loading, selected, percentage }: VoteButtonProps) {
  const style = config[variant]

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.99 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative w-full p-3.5 rounded-md border-2 transition-colors overflow-hidden text-left',
        selected ? style.selected : style.base,
        disabled && !selected && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Background percentage bar */}
      {percentage !== undefined && percentage > 0 && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={cn('absolute inset-y-0 left-0 opacity-40', style.bar)}
        />
      )}

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
              selected ? style.indicator : 'border-stone-300 bg-white'
            )}
          >
            {loading ? (
              <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
            ) : selected ? (
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            ) : null}
          </span>
          <span className={cn('text-sm font-medium', selected ? style.text : 'text-stone-700')}>
            {style.label}
          </span>
        </div>

        {percentage !== undefined && percentage > 0 && (
          <span className="text-xs text-stone-400">{Math.round(percentage)}%</span>
        )}
      </div>
    </motion.button>
  )
}
