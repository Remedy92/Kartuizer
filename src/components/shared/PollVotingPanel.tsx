import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, Pencil } from 'lucide-react'
import type { Question, Vote } from '@/types'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui'

interface PollVotingPanelProps {
  question: Question
  userVotes: Vote[]
  isVoting: boolean
  onVote: (optionId: string) => void
  onMultiVote: (optionIds: string[]) => void
}

const neutralBars = [
  'bg-gradient-to-r from-stone-400 via-stone-300 to-stone-200',
  'bg-gradient-to-r from-stone-500 via-stone-400 to-stone-300',
  'bg-gradient-to-r from-stone-300 via-stone-200 to-stone-100',
  'bg-gradient-to-r from-stone-600 via-stone-500 to-stone-400',
]

export function PollVotingPanel({
  question,
  userVotes,
  isVoting,
  onVote,
  onMultiVote,
}: PollVotingPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())

  const options = useMemo(
    () => (question.poll_options ?? []).sort((a, b) => a.sort_order - b.sort_order),
    [question.poll_options]
  )

  const userSelectedOptionIds = useMemo(
    () => new Set(userVotes.map((v) => v.poll_option_id).filter(Boolean) as string[]),
    [userVotes]
  )

  const hasVoted = userVotes.length > 0

  const voteCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const vote of question.votes ?? []) {
      if (vote.poll_option_id) {
        counts.set(vote.poll_option_id, (counts.get(vote.poll_option_id) || 0) + 1)
      }
    }
    return counts
  }, [question.votes])

  const totalVotes = useMemo(
    () => (question.votes ?? []).filter((v) => v.poll_option_id).length,
    [question.votes]
  )

  const totalVoters = useMemo(
    () => new Set((question.votes ?? []).filter((v) => v.poll_option_id).map((v) => v.user_id)).size,
    [question.votes]
  )

  const winningOption = useMemo(
    () => options.find((o) => o.id === question.winning_option_id),
    [options, question.winning_option_id]
  )
  const winningCount = winningOption ? voteCounts.get(winningOption.id) || 0 : 0
  const winningPercentage = totalVotes > 0 ? Math.round((winningCount / totalVotes) * 100) : 0

  const rankMap = useMemo(() => {
    const sorted = [...options].sort(
      (a, b) => (voteCounts.get(b.id) || 0) - (voteCounts.get(a.id) || 0)
    )
    const map = new Map<string, number>()
    sorted.forEach((option, index) => map.set(option.id, index + 1))
    return map
  }, [options, voteCounts])

  if (hasVoted && !isEditing) {
    const selectedLabels = options
      .filter((o) => userSelectedOptionIds.has(o.id))
      .map((o) => o.label)

    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5 text-emerald-600" />
        </div>
        <p className="text-sm font-medium text-stone-700 mb-1">Stem uitgebracht</p>
        <p className="text-xs text-stone-500">{selectedLabels.join(', ')}</p>

        {question.winning_option_id && winningOption && totalVotes > 0 && (
          <p className="text-xs text-amber-600 mt-2 font-medium">
            Tussenstand: {winningOption.label} • {winningPercentage}% ({winningCount} stemmen)
          </p>
        )}

        {totalVotes > 0 && (
          <div className="mt-3 rounded-md border border-stone-200 bg-stone-50/70 p-2 text-left">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-stone-500">
              <span>Verdeling</span>
              <span>{totalVotes} stemmen</span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-stone-100 overflow-hidden flex">
              {options.map((option, index) => {
                const count = voteCounts.get(option.id) || 0
                const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0
                const isWinner = option.id === question.winning_option_id
                const barClass = isWinner
                  ? 'bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400'
                  : neutralBars[index % neutralBars.length]

                return (
                  <div key={option.id} className="h-full" style={{ width: `${percentage}%` }}>
                    <Tooltip
                      className="h-full w-full"
                      content={
                        <div className="flex items-center gap-2">
                          <span className={cn('font-medium', isWinner ? 'text-primary-200' : '')}>
                            {option.label}
                          </span>
                          <span className="text-stone-300">•</span>
                          <span>{count} {count === 1 ? 'stem' : 'stemmen'}</span>
                          <span className="text-stone-300">•</span>
                          <span>{Math.round(percentage)}%</span>
                        </div>
                      }
                    >
                      <div className={cn('h-full w-full', barClass)} />
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-stone-400 mt-3">
          {totalVoters} / {question.groups?.required_votes} stemmers
        </p>

        <button
          onClick={() => {
            setIsEditing(true)
            setSelectedOptions(new Set(userSelectedOptionIds))
          }}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700"
        >
          <Pencil size={12} />
          <span>Stem wijzigen</span>
        </button>
      </div>
    )
  }

  const handleOptionClick = (optionId: string) => {
    if (isVoting) return

    if (question.allow_multiple) {
      const newSelected = new Set(selectedOptions)
      if (newSelected.has(optionId)) {
        newSelected.delete(optionId)
      } else {
        newSelected.add(optionId)
      }
      setSelectedOptions(newSelected)
    } else {
      onVote(optionId)
      setIsEditing(false)
    }
  }

  const handleSubmitMulti = () => {
    if (selectedOptions.size === 0) return
    onMultiVote(Array.from(selectedOptions))
    setIsEditing(false)
    setSelectedOptions(new Set())
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-400 uppercase tracking-wider mb-4 text-center lg:text-left">
        {isEditing ? 'Wijzig uw keuze' : question.allow_multiple ? 'Kies meerdere' : 'Maak uw keuze'}
      </p>

      {totalVotes > 0 && (
        <div className="rounded-lg border border-stone-200 bg-stone-50/70 p-3 mb-2">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-stone-500">
            <span>Tussenstand</span>
            <span>{totalVotes} stemmen</span>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-stone-100 overflow-hidden flex">
            {options.map((option, index) => {
              const count = voteCounts.get(option.id) || 0
              const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0
              const isWinner = option.id === question.winning_option_id
              const barClass = isWinner
                ? 'bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400'
                : neutralBars[index % neutralBars.length]

              return (
                <div key={option.id} className="h-full" style={{ width: `${percentage}%` }}>
                  <Tooltip
                    className="h-full w-full"
                    content={
                      <div className="flex items-center gap-2">
                        <span className={cn('font-medium', isWinner ? 'text-primary-200' : '')}>
                          {option.label}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span>{count} {count === 1 ? 'stem' : 'stemmen'}</span>
                        <span className="text-stone-300">•</span>
                        <span>{Math.round(percentage)}%</span>
                      </div>
                    }
                  >
                    <div className={cn('h-full w-full', barClass)} />
                  </Tooltip>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {options.map((option, index) => {
          const isSelected = question.allow_multiple
            ? selectedOptions.has(option.id)
            : userSelectedOptionIds.has(option.id)
          const voteCount = voteCounts.get(option.id) || 0
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
          const isWinner = option.id === question.winning_option_id
          const rank = rankMap.get(option.id)

          return (
            <Tooltip
              key={option.id}
              className="block"
              align="start"
              content={
                <div className="flex items-center gap-2">
                  <span className={cn('font-medium', isWinner ? 'text-primary-200' : '')}>
                    {option.label}
                  </span>
                  <span className="text-stone-300">•</span>
                  <span>{voteCount} {voteCount === 1 ? 'stem' : 'stemmen'}</span>
                  <span className="text-stone-300">•</span>
                  <span>{percentage}%</span>
                  {rank ? (
                    <>
                      <span className="text-stone-300">•</span>
                      <span>#{rank}</span>
                    </>
                  ) : null}
                </div>
              }
            >
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleOptionClick(option.id)}
                disabled={isVoting}
                className={cn(
                  'w-full text-left p-3 border-2 transition-all duration-200 relative overflow-hidden',
                  'rounded-md',
                  isSelected
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                )}
              >
                <div className="flex items-start gap-3 relative z-10">
                  <div
                    className={cn(
                      'w-4 h-4 flex-shrink-0 mt-0.5 border-2 transition-all duration-200',
                      question.allow_multiple ? '' : 'rounded-full',
                      isSelected
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-stone-300 bg-white'
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-full h-full flex items-center justify-center"
                      >
                        {question.allow_multiple ? (
                          <Check className="w-2.5 h-2.5 text-white" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </motion.div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        'text-sm font-medium block',
                        isSelected ? 'text-primary-800' : 'text-stone-700'
                      )}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="text-xs text-stone-500 block mt-0.5">
                        {option.description}
                      </span>
                    )}
                  </div>

                  {totalVotes > 0 && (
                    <span
                      className={cn(
                        'text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                        isWinner
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-stone-100 text-stone-500'
                      )}
                    >
                      {percentage}%
                    </span>
                  )}
                </div>

                {totalVotes > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      'absolute inset-y-0 left-0 z-0 opacity-80',
                      isSelected
                        ? 'bg-primary-100'
                        : isWinner
                          ? 'bg-primary-50'
                          : 'bg-stone-50'
                    )}
                  />
                )}
              </motion.button>
            </Tooltip>
          )
        })}
      </div>

      {question.allow_multiple && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleSubmitMulti}
          disabled={isVoting || selectedOptions.size === 0}
          className={cn(
            'w-full mt-3 py-2.5 text-sm font-medium transition-all duration-200',
            selectedOptions.size > 0
              ? 'bg-primary-800 text-white hover:bg-primary-900'
              : 'bg-stone-100 text-stone-400 cursor-not-allowed'
          )}
        >
          {isVoting ? 'Bezig...' : `Bevestigen (${selectedOptions.size} geselecteerd)`}
        </motion.button>
      )}

      {isEditing && (
        <button
          onClick={() => {
            setIsEditing(false)
            setSelectedOptions(new Set())
          }}
          className="w-full text-xs text-stone-400 hover:text-stone-600 mt-2 py-2"
        >
          Annuleren
        </button>
      )}
    </div>
  )
}
