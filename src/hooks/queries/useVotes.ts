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
      return votesApi.cast(questionId, vote)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(variables.questionId) })
    },
  })
}

export function usePollVote() {
  const queryClient = useQueryClient()
  const session = useAuthStore((s) => s.session)

  return useMutation({
    mutationFn: async ({ questionId, optionId }: { questionId: string; optionId: string }) => {
      if (!session?.user?.id) {
        throw new Error('Je moet ingelogd zijn om te stemmen.')
      }
      return votesApi.castPollVote(questionId, optionId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(variables.questionId) })
    },
  })
}

export function useMultiPollVote() {
  const queryClient = useQueryClient()
  const session = useAuthStore((s) => s.session)

  return useMutation({
    mutationFn: async ({ questionId, optionIds }: { questionId: string; optionIds: string[] }) => {
      if (!session?.user?.id) {
        throw new Error('Je moet ingelogd zijn om te stemmen.')
      }
      return votesApi.castMultiplePollVotes(questionId, optionIds)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(variables.questionId) })
    },
  })
}
