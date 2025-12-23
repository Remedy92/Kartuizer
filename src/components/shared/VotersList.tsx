import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, User } from 'lucide-react'
import type { Vote, VoteType } from '@/types'
import { cn } from '@/lib/utils'

interface VotersListProps {
  votes: Vote[]
  variant?: 'standard' | 'poll'
  pollOptionId?: string // For poll variant: filter votes by this option
}

const voteConfig = {
  yes: {
    label: 'Akkoord',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  no: {
    label: 'Niet akkoord',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    text: 'text-rose-700',
    badge: 'bg-rose-100 text-rose-700',
  },
  abstain: {
    label: 'Onthouding',
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    dot: 'bg-stone-400',
    text: 'text-stone-600',
    badge: 'bg-stone-100 text-stone-600',
  },
} as const

function getVoterName(vote: Vote): string {
  if (vote.user_profiles?.display_name) {
    return vote.user_profiles.display_name
  }
  if (vote.user_profiles?.email) {
    // Extract name from email (before @)
    const emailName = vote.user_profiles.email.split('@')[0]
    // Capitalize first letter
    return emailName.charAt(0).toUpperCase() + emailName.slice(1)
  }
  return 'Onbekend'
}

function VoterBadge({ vote, showVoteType = false }: { vote: Vote; showVoteType?: boolean }) {
  const config = vote.vote ? voteConfig[vote.vote] : null
  const name = getVoterName(vote)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        config ? config.badge : 'bg-primary-100 text-primary-700'
      )}
    >
      <User className="w-3 h-3" />
      <span>{name}</span>
      {showVoteType && config && (
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      )}
    </motion.div>
  )
}

// For standard questions: group voters by vote type
function StandardVotersList({ votes }: { votes: Vote[] }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const groupedVotes = useMemo(() => {
    const groups: Record<VoteType, Vote[]> = {
      yes: [],
      no: [],
      abstain: [],
    }
    for (const vote of votes) {
      if (vote.vote) {
        groups[vote.vote].push(vote)
      }
    }
    return groups
  }, [votes])

  const hasVotes = votes.length > 0

  if (!hasVotes) return null

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-medium text-stone-500 uppercase tracking-wide hover:text-stone-700 transition-colors w-full"
      >
        <span>Wie heeft gestemd</span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
        <span className="text-stone-400 normal-case font-normal">
          ({votes.length} {votes.length === 1 ? 'stem' : 'stemmen'})
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1">
              {(['yes', 'no', 'abstain'] as const).map((voteType) => {
                const votersInGroup = groupedVotes[voteType]
                if (votersInGroup.length === 0) return null
                const config = voteConfig[voteType]

                return (
                  <motion.div
                    key={voteType}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: voteType === 'yes' ? 0 : voteType === 'no' ? 0.05 : 0.1 }}
                    className={cn(
                      'rounded-lg border p-3',
                      config.bg,
                      config.border
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('w-2 h-2 rounded-full', config.dot)} />
                      <span className={cn('text-xs font-semibold', config.text)}>
                        {config.label}
                      </span>
                      <span className="text-xs text-stone-400">
                        ({votersInGroup.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {votersInGroup.map((vote, index) => (
                        <motion.div
                          key={vote.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <VoterBadge vote={vote} />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// For polls: show voters for a specific option
function PollVotersList({ votes, pollOptionId }: { votes: Vote[]; pollOptionId: string }) {
  const filteredVotes = useMemo(
    () => votes.filter((v) => v.poll_option_id === pollOptionId),
    [votes, pollOptionId]
  )

  if (filteredVotes.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {filteredVotes.map((vote, index) => (
        <motion.div
          key={vote.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03 }}
        >
          <VoterBadge vote={vote} />
        </motion.div>
      ))}
    </div>
  )
}

export function VotersList({ votes, variant = 'standard', pollOptionId }: VotersListProps) {
  if (variant === 'poll' && pollOptionId) {
    return <PollVotersList votes={votes} pollOptionId={pollOptionId} />
  }
  return <StandardVotersList votes={votes} />
}
