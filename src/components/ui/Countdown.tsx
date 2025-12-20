import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { getTimeRemaining } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CountdownProps {
  deadline: string | Date
  onExpire?: () => void
  className?: string
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

  if (timeLeft.isExpired) {
    return (
      <div className={cn('flex items-center gap-1.5 text-rose-600 text-sm', className)}>
        <Clock size={14} />
        <span>Verlopen</span>
      </div>
    )
  }

  const formatTime = () => {
    if (timeLeft.days > 0) {
      return `${timeLeft.days}d ${timeLeft.hours}u`
    }
    if (timeLeft.hours > 0) {
      return `${timeLeft.hours}u ${timeLeft.minutes}m`
    }
    return `${timeLeft.minutes}m ${timeLeft.seconds}s`
  }

  const isUrgent = timeLeft.total < 24 * 60 * 60 * 1000 // Less than 24 hours

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm',
        isUrgent ? 'text-amber-600' : 'text-stone-500',
        className
      )}
    >
      <Clock size={14} />
      <span>{formatTime()}</span>
    </div>
  )
}
