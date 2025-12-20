import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary:
        'bg-primary-800 text-white hover:bg-primary-900 active:bg-primary-950',
      secondary:
        'bg-stone-100 text-stone-800 hover:bg-stone-200 active:bg-stone-300',
      outline:
        'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300',
      ghost: 'text-stone-600 hover:text-stone-900 hover:bg-stone-100',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs tracking-wide',
      md: 'px-4 py-2.5 text-sm tracking-wide',
      lg: 'px-6 py-3 text-sm tracking-wider uppercase',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
