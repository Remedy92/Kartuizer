import { cn } from '@/lib/utils'

interface WordmarkProps {
  size?: 'default' | 'large'
  onClick?: () => void
}

export function Wordmark({ size = 'default', onClick }: WordmarkProps) {
  return (
    <div
      className={cn('select-none', onClick && 'cursor-pointer group')}
      onClick={onClick}
    >
      <div
        className={cn(
          'font-serif tracking-[0.3em] text-stone-800 transition-colors',
          size === 'large' ? 'text-2xl md:text-3xl' : 'text-lg',
          onClick && 'group-hover:text-primary-700'
        )}
      >
        KARTHUIZER
      </div>
      <div
        className={cn(
          'tracking-[0.2em] text-stone-400 uppercase',
          size === 'large' ? 'text-[11px] mt-1' : 'text-[9px] mt-0.5'
        )}
      >
        Domein
      </div>
    </div>
  )
}
