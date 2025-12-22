import { Check, X, Minus, Loader2 } from 'lucide-react'
import type { VoteType } from '@/types'
import { cn } from '@/lib/utils'

interface VoteButtonProps {
  variant: VoteType
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  selected?: boolean
}

const config = {
  yes: {
    label: 'Akkoord',
    icon: Check,
    hover: 'hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700',
    selected: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  },
  no: {
    label: 'Niet akkoord',
    icon: X,
    hover: 'hover:border-rose-500 hover:bg-rose-50 hover:text-rose-700',
    selected: 'border-rose-500 bg-rose-50 text-rose-700',
  },
  abstain: {
    label: 'Onthouding',
    icon: Minus,
    hover: 'hover:border-stone-400 hover:bg-stone-100',
    selected: 'border-stone-400 bg-stone-100 text-stone-700',
  },
}

export function VoteButton({ variant, onClick, disabled, loading, selected }: VoteButtonProps) {
  const { label, icon: Icon, hover, selected: selectedStyle } = config[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3',
        'border border-stone-200 text-stone-600 text-sm',
        'transition-all duration-200',
        selected && selectedStyle,
        disabled && !selected && 'opacity-50 cursor-not-allowed',
        !disabled && !selected && hover
      )}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Icon size={16} className={selected ? 'opacity-100' : 'opacity-50'} />
      )}
      <span>{label}</span>
    </button>
  )
}
