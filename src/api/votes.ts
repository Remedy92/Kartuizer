import { apiFetch } from '@/lib/api'
import type { Vote, VoteType } from '@/types'

export const votesApi = {
  // Cast a standard yes/no/abstain vote
  async cast(questionId: string, vote: VoteType): Promise<Vote> {
    return apiFetch<Vote>(`/api/questions/${questionId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ vote }),
    })
  },

  // Cast a poll vote (single choice)
  async castPollVote(questionId: string, optionId: string): Promise<Vote> {
    return apiFetch<Vote>(`/api/questions/${questionId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    })
  },

  // Cast multiple poll votes (multi-choice)
  async castMultiplePollVotes(
    questionId: string,
    optionIds: string[]
  ): Promise<Vote[]> {
    return apiFetch<Vote[]>(`/api/questions/${questionId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ optionIds }),
    })
  },

  // Get user's poll votes for a question (may be multiple for multi-choice)
  async getUserPollVotes(questionId: string, userId: string): Promise<Vote[]> {
    const question = await apiFetch<{ votes?: Vote[] }>(`/api/questions/${questionId}`)
    return (question.votes ?? []).filter((vote) => vote.user_id === userId && !!vote.poll_option_id)
  },

  async getByQuestion(questionId: string): Promise<Vote[]> {
    const question = await apiFetch<{ votes?: Vote[] }>(`/api/questions/${questionId}`)
    return question.votes ?? []
  },

  async getByUser(userId: string): Promise<Vote[]> {
    const questions = await apiFetch<Array<{ votes?: Vote[] }>>('/api/questions')
    return questions.flatMap((question) => question.votes ?? []).filter((vote) => vote.user_id === userId)
  },

  async getUserVoteForQuestion(questionId: string, userId: string): Promise<Vote | null> {
    const question = await apiFetch<{ votes?: Vote[] }>(`/api/questions/${questionId}`)
    return question.votes?.find((vote) => vote.user_id === userId) ?? null
  },
}
