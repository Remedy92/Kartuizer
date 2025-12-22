import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock } from 'lucide-react'
import { getTimeRemaining } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CountdownProps {
  deadline: string | Date
  onExpire?: () => void
  className?: string
}

// Animated digit with flip animation
function AnimatedDigit({ value, isUrgent }: { value: string; isUrgent: boolean }) {
  return (
    <div className="relative h-6 w-4 overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'absolute inset-0 flex items-center justify-center font-medium tabular-nums',
            isUrgent ? 'text-amber-600' : 'text-stone-700'
          )}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

// Time unit with animated digits
function TimeUnit({
  value,
  label,
  isUrgent,
}: {
  value: number
  label: string
  isUrgent: boolean
}) {
  const digits = String(value).padStart(2, '0')
  return (
    <div className="flex items-baseline gap-0.5">
      <div className="flex bg-stone-50 rounded px-1 py-0.5">
        <AnimatedDigit value={digits[0]} isUrgent={isUrgent} />
        <AnimatedDigit value={digits[1]} isUrgent={isUrgent} />
      </div>
      <span className={cn('text-xs', isUrgent ? 'text-amber-500' : 'text-stone-400')}>
        {label}
      </span>
    </div>
  )
}

// Format deadline in Dutch
function formatDeadline(deadline: string | Date): string {
  const date = new Date(deadline)
  const weekdays = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
  const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

  const weekday = weekdays[date.getDay()]
  const day = date.getDate()
  const month = months[date.getMonth()]
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${weekday} ${day} ${month}, ${hours}:${minutes}`
}

export function Countdown({ deadline, onExpire, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(deadline))

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = getTimeRemaining(deadline)
      setTimeLeft(newTimeLeft)

      if (newTimeLeft.isExpired) {
        clearInterval(timer)
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [deadline, onExpire])

  // Expired state
  if (timeLeft.isExpired) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.7 }}
        className={cn('flex items-center gap-1.5 text-rose-600 text-sm', className)}
      >
        <Clock size={14} />
        <span className="font-medium">Verlopen</span>
      </motion.div>
    )
  }

  const isUrgent = timeLeft.total < 24 * 60 * 60 * 1000 // Less than 24 hours
  const isCritical = timeLeft.total < 60 * 60 * 1000 // Less than 1 hour

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Deadline datetime */}
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs',
          isCritical ? 'text-rose-500' : isUrgent ? 'text-amber-500' : 'text-stone-400'
        )}
      >
        <Clock size={12} />
        <span>Deadline: {formatDeadline(deadline)}</span>
      </div>

      {/* Animated countdown */}
      <div className="flex items-center gap-2">
        {timeLeft.days > 0 && (
          <TimeUnit value={timeLeft.days} label="d" isUrgent={isUrgent} />
        )}
        {(timeLeft.days > 0 || timeLeft.hours > 0) && (
          <TimeUnit value={timeLeft.hours} label="u" isUrgent={isUrgent} />
        )}
        <TimeUnit value={timeLeft.minutes} label="m" isUrgent={isUrgent} />
        {timeLeft.days === 0 && (
          <TimeUnit value={timeLeft.seconds} label="s" isUrgent={isUrgent} />
        )}
      </div>
    </div>
  )
}
