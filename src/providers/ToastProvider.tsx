import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X, Info, AlertTriangle } from 'lucide-react'
import { useUIStore, type Toast } from '@/stores'
import { cn } from '@/lib/utils'

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  return (
    <>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: Check,
    error: X,
    info: Info,
    warning: AlertTriangle,
  }

  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  }

  const iconColors = {
    success: 'text-emerald-500',
    error: 'text-rose-500',
    info: 'text-blue-500',
    warning: 'text-amber-500',
  }

  const Icon = icons[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={cn(
        'flex items-start gap-3 p-4 border rounded-lg shadow-lg bg-white',
        colors[toast.type]
      )}
    >
      <div className={cn('flex-shrink-0', iconColors[toast.type])}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.message && <p className="text-sm opacity-80 mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-stone-400 hover:text-stone-600 transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}
