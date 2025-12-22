import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, Pencil } from 'lucide-react'
import type { Question, Vote } from '@/types'
import { cn } from '@/lib/utils'

interface PollVotingPanelProps {
  question: Question
  userVotes: Vote[]
  isVoting: boolean
  onVote: (optionId: string) => void
  onMultiVote: (optionIds: string[]) => void
}

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

  const requiredVotes = question.groups?.required_votes || 1
  const quorumPercentage = Math.min((totalVoters / requiredVotes) * 100, 100)

  // Voted state - clear hierarchy with better visualization
  if (hasVoted && !isEditing) {
    const selectedLabels = options
      .filter((o) => userSelectedOptionIds.has(o.id))
      .map((o) => o.label)

    return (
      <div className="space-y-5">
        {/* Your selection confirmation */}
        <div className="flex items-start gap-3 pb-4 border-b border-stone-100">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-0.5">Uw keuze</p>
            <p className="text-sm font-medium text-stone-800">{selectedLabels.join(', ')}</p>
          </div>
          <button
            onClick={() => {
              setIsEditing(true)
              setSelectedOptions(new Set(userSelectedOptionIds))
            }}
            className="text-xs text-stone-400 hover:text-primary-600 transition-colors flex items-center gap-1 flex-shrink-0"
          >
            <Pencil size={11} />
            Wijzigen
          </button>
        </div>

        {/* Results visualization */}
        {totalVotes > 0 && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Tussenstand
              </span>
              <span className="text-xs text-stone-400">{totalVotes} stemmen</span>
            </div>

            {/* Stacked results - each option gets a prominent bar */}
            <div className="space-y-2.5">
              {options.map((option, index) => {
                const count = voteCounts.get(option.id) || 0
                const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0
                const isWinner = option.id === question.winning_option_id

                return (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          'font-medium',
                          isWinner ? 'text-primary-700' : 'text-stone-600'
                        )}
                      >
                        {option.label}
                        {isWinner && (
                          <span className="ml-1.5 text-[10px] text-primary-500 uppercase tracking-wide">
                            Koploper
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(isWinner ? 'text-primary-600 font-medium' : 'text-stone-400')}
                      >
                        {count} · {Math.round(percentage)}%
                      </span>
                    </div>

                    <div className="h-3 rounded-sm bg-stone-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{
                          duration: 0.5,
                          delay: index * 0.05,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={cn(
                          'h-full rounded-sm',
                          isWinner
                            ? 'bg-gradient-to-r from-primary-500 to-primary-400'
                            : 'bg-stone-300'
                        )}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quorum progress */}
        <div className="pt-3 border-t border-stone-100">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
            <span>Deelname</span>
            <span>
              {totalVoters} / {requiredVotes} stemmers
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${quorumPercentage}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-primary-400"
            />
          </div>
        </div>
      </div>
    )
  }

  // Voting state - options to choose from
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
    <div className="space-y-4">
      <p className="text-xs text-stone-500 uppercase tracking-wide">
        {isEditing ? 'Wijzig uw keuze' : question.allow_multiple ? 'Kies meerdere opties' : 'Maak uw keuze'}
      </p>

      {/* Poll options */}
      <div className="space-y-2">
        {options.map((option, index) => {
          const isSelected = question.allow_multiple
            ? selectedOptions.has(option.id)
            : userSelectedOptionIds.has(option.id)
          const voteCount = voteCounts.get(option.id) || 0
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
          const isWinner = option.id === question.winning_option_id

          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={isVoting ? undefined : { scale: 1.01 }}
              whileTap={isVoting ? undefined : { scale: 0.99 }}
              onClick={() => handleOptionClick(option.id)}
              disabled={isVoting}
              className={cn(
                'w-full text-left p-3.5 border-2 transition-all duration-200 relative overflow-hidden',
                'rounded-md',
                isSelected
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              )}
            >
              {/* Background percentage bar */}
              {totalVotes > 0 && percentage > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    'absolute inset-y-0 left-0 z-0 opacity-40',
                    isSelected ? 'bg-primary-100' : isWinner ? 'bg-primary-50' : 'bg-stone-50'
                  )}
                />
              )}

              <div className="flex items-start gap-3 relative z-10">
                <div
                  className={cn(
                    'w-4 h-4 flex-shrink-0 mt-0.5 border-2 transition-all duration-200 flex items-center justify-center',
                    question.allow_multiple ? 'rounded-sm' : 'rounded-full',
                    isSelected ? 'border-primary-600 bg-primary-600' : 'border-stone-300 bg-white'
                  )}
                >
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      {question.allow_multiple ? (
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
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
                    <span className="text-xs text-stone-500 block mt-0.5">{option.description}</span>
                  )}
                </div>

                {totalVotes > 0 && (
                  <span
                    className={cn(
                      'text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                      isWinner ? 'bg-primary-100 text-primary-700' : 'bg-stone-100 text-stone-500'
                    )}
                  >
                    {Math.round(percentage)}%
                  </span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Submit button for multi-select */}
      {question.allow_multiple && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleSubmitMulti}
          disabled={isVoting || selectedOptions.size === 0}
          className={cn(
            'w-full mt-2 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
            selectedOptions.size > 0
              ? 'bg-primary-800 text-white hover:bg-primary-900'
              : 'bg-stone-100 text-stone-400 cursor-not-allowed'
          )}
        >
          {isVoting ? 'Bezig...' : `Bevestigen (${selectedOptions.size} geselecteerd)`}
        </motion.button>
      )}

      {/* Voter count */}
      <p className="text-xs text-stone-400 text-center pt-2">
        {totalVoters} van {requiredVotes} stemmers
      </p>

      {isEditing && (
        <button
          onClick={() => {
            setIsEditing(false)
            setSelectedOptions(new Set())
          }}
          className="w-full text-xs text-stone-400 hover:text-stone-600 py-2 transition-colors"
        >
          Annuleren
        </button>
      )}
    </div>
  )
}
