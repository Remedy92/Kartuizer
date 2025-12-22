import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'center' | 'start' | 'end'
  className?: string
  contentClassName?: string
}

const sideClasses = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
  left: 'right-full mr-2',
  right: 'left-full ml-2',
}

const alignClasses = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-0',
  end: 'right-0',
}

const arrowClasses = {
  top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
  bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
  left: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2',
  right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2',
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
  contentClassName,
}: TooltipProps) {
  return (
    <div className={cn('relative inline-flex group', className)}>
      {children}
      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-30 opacity-0',
          'translate-y-1 group-hover:translate-y-0 group-hover:opacity-100',
          'transition-all duration-200',
          sideClasses[side],
          alignClasses[align]
        )}
      >
        <div
          className={cn(
            'relative rounded-md bg-stone-900 px-2.5 py-1.5 text-[11px] leading-tight text-white shadow-lg',
            'border border-stone-800 whitespace-nowrap',
            contentClassName
          )}
        >
          {content}
          <span
            aria-hidden="true"
            className={cn(
              'absolute h-2 w-2 rotate-45 bg-stone-900 border border-stone-800',
              arrowClasses[side]
            )}
          />
        </div>
      </div>
    </div>
  )
}
