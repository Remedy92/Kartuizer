import { useMutation, useQueryClient } from '@tanstack/react-query'
import { votesApi } from '@/api'
import type { VoteType } from '@/types'
import { useAuthStore } from '@/stores'
import { questionKeys } from './useQuestions'

export function useVote() {
  const queryClient = useQueryClient()
  const session = useAuthStore((s) => s.session)

  return useMutation({
    mutationFn: async ({ questionId, vote }: { questionId: string; vote: VoteType }) => {
      if (!session?.user?.id) {
        throw new Error('Je moet ingelogd zijn om te stemmen.')
      }
      return votesApi.cast(questionId, vote, session.user.id)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(variables.questionId) })
    },
  })
}
