import { apiFetch } from '@/lib/api'
import type { VoteComment } from '@/types'

export const voteCommentsApi = {
  async upsert(questionId: string, comment: string): Promise<VoteComment> {
    const trimmed = comment.trim()
    if (!trimmed) {
      throw new Error('Commentaar is leeg.')
    }

    return apiFetch<VoteComment>(`/api/questions/${questionId}/comment`, {
      method: 'PUT',
      body: JSON.stringify({ comment: trimmed }),
    })
  },

  async remove(questionId: string): Promise<void> {
    return apiFetch<void>(`/api/questions/${questionId}/comment`, {
      method: 'DELETE',
    })
  },
}
