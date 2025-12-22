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

  // Calculate vote counts per option
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
  const winningOption = useMemo(
    () => options.find((o) => o.id === question.winning_option_id),
    [options, question.winning_option_id]
  )
  const winningCount = winningOption ? voteCounts.get(winningOption.id) || 0 : 0
  const winningPercentage = totalVotes > 0 ? Math.round((winningCount / totalVotes) * 100) : 0

  // User has voted and is not editing - show confirmation
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

        {/* Show current leader if there's a winner */}
        {question.winning_option_id && winningOption && totalVotes > 0 && (
          <p className="text-xs text-amber-600 mt-2 font-medium">
            Tussenstand: {winningOption.label} • {winningPercentage}% ({winningCount} stemmen)
          </p>
        )}

        <p className="text-xs text-stone-400 mt-3">
          {new Set((question.votes ?? []).filter((v) => v.poll_option_id).map((v) => v.user_id)).size} /{' '}
          {question.groups?.required_votes} stemmers
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

  // Handle option selection
  const handleOptionClick = (optionId: string) => {
    if (isVoting) return

    if (question.allow_multiple) {
      // Multi-choice: toggle selection
      const newSelected = new Set(selectedOptions)
      if (newSelected.has(optionId)) {
        newSelected.delete(optionId)
      } else {
        newSelected.add(optionId)
      }
      setSelectedOptions(newSelected)
    } else {
      // Single choice: immediately vote
      onVote(optionId)
      setIsEditing(false)
    }
  }

  // Submit multi-choice votes
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

      <div className="space-y-2">
        {options.map((option, index) => {
          const isSelected = question.allow_multiple
            ? selectedOptions.has(option.id)
            : userSelectedOptionIds.has(option.id)
          const voteCount = voteCounts.get(option.id) || 0
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleOptionClick(option.id)}
              disabled={isVoting}
              className={cn(
                'w-full text-left p-3 border-2 transition-all duration-200 relative overflow-hidden',
                isSelected
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              )}
            >
              <div className="flex items-start gap-3 relative z-10">
                {/* Selection indicator */}
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

                {/* Vote count indicator (subtle) */}
                {totalVotes > 0 && (
                  <span className="text-xs text-stone-400 flex-shrink-0">
                    {percentage}%
                  </span>
                )}
              </div>

              {/* Background progress bar */}
              {totalVotes > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    'absolute inset-y-0 left-0 z-0',
                    isSelected ? 'bg-primary-100' : 'bg-stone-100'
                  )}
                />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Submit button for multi-choice */}
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

      {/* Cancel editing */}
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
