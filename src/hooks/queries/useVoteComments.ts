import { useMutation, useQueryClient } from '@tanstack/react-query'
import { voteCommentsApi } from '@/api'
import { useAuthStore } from '@/stores'
import { questionKeys } from './useQuestions'

export function useUpsertVoteComment() {
  const queryClient = useQueryClient()
  const session = useAuthStore((s) => s.session)

  return useMutation({
    mutationFn: async ({ questionId, comment }: { questionId: string; comment: string }) => {
      if (!session?.user?.id) {
        throw new Error('Je moet ingelogd zijn om commentaar toe te voegen.')
      }
      return voteCommentsApi.upsert(questionId, comment)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(variables.questionId) })
    },
  })
}

export function useDeleteVoteComment() {
  const queryClient = useQueryClient()
  const session = useAuthStore((s) => s.session)

  return useMutation({
    mutationFn: async ({ questionId }: { questionId: string }) => {
      if (!session?.user?.id) {
        throw new Error('Je moet ingelogd zijn om commentaar te verwijderen.')
      }
      return voteCommentsApi.remove(questionId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(variables.questionId) })
    },
  })
}
