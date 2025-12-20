import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { questionsApi, type CreateQuestionInput, type UpdateQuestionInput } from '@/api'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { QuestionStatus, CompletionMethod } from '@/types'

export const questionKeys = {
  all: ['questions'] as const,
  lists: () => [...questionKeys.all, 'list'] as const,
  list: (status: QuestionStatus) => [...questionKeys.lists(), status] as const,
  details: () => [...questionKeys.all, 'detail'] as const,
  detail: (id: string) => [...questionKeys.details(), id] as const,
}

export function useQuestions(status: QuestionStatus) {
  return useQuery({
    queryKey: questionKeys.list(status),
    queryFn: () => questionsApi.getByStatus(status),
    retry: false,
    enabled: isSupabaseConfigured,
  })
}

export function useOpenQuestions() {
  return useQuestions('open')
}

export function useCompletedQuestions() {
  return useQuestions('completed')
}

export function useAllQuestions() {
  return useQuery({
    queryKey: questionKeys.lists(),
    queryFn: () => questionsApi.getAll(),
    retry: false,
    enabled: isSupabaseConfigured,
  })
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: questionKeys.detail(id),
    queryFn: () => questionsApi.getById(id),
    retry: false,
    enabled: isSupabaseConfigured && !!id,
  })
}

export function useCreateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateQuestionInput) => questionsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
    },
  })
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateQuestionInput & { id: string }) =>
      questionsApi.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(variables.id) })
    },
  })
}

export function useCloseQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, method = 'manual' }: { id: string; method?: CompletionMethod }) =>
      questionsApi.close(id, method),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(variables.id) })
    },
  })
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => questionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
    },
  })
}
