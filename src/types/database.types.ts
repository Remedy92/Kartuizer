export type VoteType = 'yes' | 'no' | 'abstain'
export type QuestionStatus = 'open' | 'completed'
export type CompletionMethod = 'manual' | 'threshold' | 'deadline'
export type UserRole = 'member' | 'admin' | 'super_admin'
export type GroupMemberRole = 'member' | 'chair' | 'admin'
export type NotificationType = 'new_question' | 'vote_reminder' | 'question_completed' | 'deadline_approaching'

export interface Group {
  id: string
  name: string
  description?: string
  required_votes: number
  created_at: string
  created_by?: string
}

export interface Question {
  id: string
  title: string
  description: string
  status: QuestionStatus
  group_id: string
  deadline?: string
  completed_at?: string
  completion_method?: CompletionMethod
  created_at: string
  updated_at?: string
  // Joined data
  groups?: Group
  votes?: Vote[]
}

export interface Vote {
  id: string
  question_id: string
  user_id: string
  vote: VoteType
  created_at: string
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
  role: GroupMemberRole
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
      acc[v.vote] = (acc[v.vote] || 0) + 1
      return acc
    },
    { yes: 0, no: 0, abstain: 0 } as VoteSummary
  )
}
