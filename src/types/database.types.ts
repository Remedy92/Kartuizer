export type VoteType = 'yes' | 'no' | 'abstain'
export type QuestionStatus = 'open' | 'completed'
export type CompletionMethod = 'manual' | 'threshold' | 'deadline'
export type UserRole = 'member' | 'admin'

export type NotificationType = 'new_question' | 'vote_reminder' | 'question_completed' | 'deadline_approaching'
export type QuestionType = 'standard' | 'poll'

export interface Group {
  id: string
  name: string
  description?: string
  required_votes: number
  created_at: string
  created_by?: string
}

export type DecidedResult = 'yes' | 'no' | null

export interface PollOption {
  id: string
  question_id: string
  label: string
  description?: string
  sort_order: number
  created_at: string
  // Computed (not in DB)
  vote_count?: number
}

export interface Question {
  id: string
  title: string
  description: string
  status: QuestionStatus
  group_id: string
  question_type: QuestionType
  allow_multiple: boolean
  deadline?: string
  completed_at?: string
  completion_method?: CompletionMethod
  decided_result?: DecidedResult // Server-computed majority result (for standard votes)
  winning_option_id?: string // Server-computed winner (for polls)
  created_at: string
  updated_at?: string
  // Joined data
  groups?: Group
  votes?: Vote[]
  poll_options?: PollOption[]
  winning_option?: PollOption
}

export interface VoteUserProfile {
  id: string
  display_name?: string
  email: string
}

export interface Vote {
  id: string
  question_id: string
  user_id: string
  vote: VoteType | null // null for poll votes
  poll_option_id?: string // set for poll votes
  created_at: string
  updated_at?: string
  // Joined data
  poll_options?: PollOption
  user_profiles?: VoteUserProfile // who cast this vote (non-anonymous voting)
}

export interface UserProfile {
  id: string
  email: string
  display_name?: string
  role: UserRole
  created_at: string
  updated_at?: string
  last_active_at?: string
}

export interface GroupMember {
  user_id: string
  group_id: string
  joined_at: string
  // Joined data
  user_profiles?: UserProfile
  groups?: Group
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message?: string
  question_id?: string
  read: boolean
  created_at: string
  // Joined data
  questions?: Question
}

export interface ActivityLog {
  id: string
  user_id?: string
  action: string
  entity_type: string
  entity_id?: string
  metadata: Record<string, unknown>
  created_at: string
  // Joined data
  user_profiles?: UserProfile
}

export interface VoteSummary {
  yes: number
  no: number
  abstain: number
}

export type VoteResult = 'approved' | 'rejected' | 'no_majority'

export function getVoteResult(summary: VoteSummary): VoteResult {
  if (summary.yes > summary.no) return 'approved'
  if (summary.no > summary.yes) return 'rejected'
  return 'no_majority'
}

export function calculateVoteSummary(votes: Vote[]): VoteSummary {
  return votes.reduce(
    (acc, v) => {
      if (v.vote) {
        acc[v.vote] = (acc[v.vote] || 0) + 1
      }
      return acc
    },
    { yes: 0, no: 0, abstain: 0 } as VoteSummary
  )
}

// Poll-specific types and helpers
export interface PollOptionSummary {
  option: PollOption
  vote_count: number
  percentage: number
}

export interface PollSummary {
  options: PollOptionSummary[]
  total_votes: number
  total_voters: number
  winner?: PollOption
}

export function calculatePollSummary(
  options: PollOption[],
  votes: Vote[],
  winningOptionId?: string
): PollSummary {
  // Count votes per option
  const voteCounts = new Map<string, number>()
  const uniqueVoters = new Set<string>()

  for (const vote of votes) {
    if (vote.poll_option_id) {
      voteCounts.set(
        vote.poll_option_id,
        (voteCounts.get(vote.poll_option_id) || 0) + 1
      )
      uniqueVoters.add(vote.user_id)
    }
  }

  const totalVotes = votes.filter(v => v.poll_option_id).length

  const optionSummaries: PollOptionSummary[] = options
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(option => ({
      option,
      vote_count: voteCounts.get(option.id) || 0,
      percentage: totalVotes > 0
        ? Math.round(((voteCounts.get(option.id) || 0) / totalVotes) * 100)
        : 0
    }))

  // Detect ties: if multiple options share the max vote count, there's no winner
  const voteCountValues = Array.from(voteCounts.values())
  const maxVotes = voteCountValues.length > 0 ? Math.max(...voteCountValues) : 0
  const optionsWithMaxVotes = Array.from(voteCounts.entries()).filter(
    ([, count]) => count === maxVotes
  )
  const hasTie = maxVotes > 0 && optionsWithMaxVotes.length > 1

  // Only declare a winner if there's no tie
  const winner = !hasTie && winningOptionId
    ? options.find(o => o.id === winningOptionId)
    : undefined

  return {
    options: optionSummaries,
    total_votes: totalVotes,
    total_voters: uniqueVoters.size,
    winner
  }
}

export function calculateTotalVotes(question: Question): number {
  if (!question.votes) return 0

  if (question.question_type === 'poll') {
    // For polls, count distinct users who cast at least one poll vote
    const uniqueVoters = new Set(
      question.votes
        .filter((v) => v.poll_option_id)
        .map((v) => v.user_id)
    )
    return uniqueVoters.size
  }

  // For standard questions, use calculateVoteSummary
  const summary = calculateVoteSummary(question.votes)
  return summary.yes + summary.no + summary.abstain
}
