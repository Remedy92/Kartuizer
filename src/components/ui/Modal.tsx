import { useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  // Close on escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal content - bottom sheet on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full bg-white shadow-2xl max-h-[90vh] overflow-y-auto',
              'rounded-t-2xl sm:rounded-none',
              'pb-[env(safe-area-inset-bottom)]',
              sizes[size]
            )}
          >
            {/* Header */}
            {(title || description) && (
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-stone-100 sticky top-0 bg-white z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {title && (
                      <h2 className="text-lg sm:text-xl font-serif text-stone-800">{title}</h2>
                    )}
                    {description && (
                      <p className="mt-1 text-sm text-stone-500">{description}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 -m-1 text-stone-400 hover:text-stone-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="p-4 sm:p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
