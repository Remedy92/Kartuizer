import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-medium text-stone-500 mb-2 tracking-wider uppercase"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full bg-stone-50 border-0 border-b-2 border-stone-200 px-4 py-3',
            'text-stone-800 placeholder:text-stone-400',
            'focus:border-primary-600 focus:ring-0 focus:bg-white',
            'transition-all',
            error && 'border-rose-500 focus:border-rose-600',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-rose-600">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
