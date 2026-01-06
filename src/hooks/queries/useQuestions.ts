import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  questionsApi,
  type CreateQuestionInput,
  type CreatePollInput,
  type UpdateQuestionInput,
  type UpdatePollDraftInput,
} from '@/api'
import { isSupabaseConfigured, supabase, supabaseUrl } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import type { QuestionStatus, CompletionMethod } from '@/types'

async function sendNewQuestionEmail(questionId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Niet ingelogd')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-new-question`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ questionId }),
  })

  if (response.ok) return

  const payload = await response.json().catch(() => ({} as { error?: string }))
  throw new Error(payload.error || 'Mail versturen mislukt')
}

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
  const { warning } = useToast()

  return useMutation({
    mutationFn: (input: CreateQuestionInput) => questionsApi.create(input),
    onSuccess: (question) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
      void sendNewQuestionEmail(question.id).catch((err) => {
        const message = err instanceof Error ? err.message : 'Mail versturen mislukt'
        warning('Mail niet verstuurd', message)
      })
    },
  })
}

export function useCreatePoll() {
  const queryClient = useQueryClient()
  const { warning } = useToast()

  return useMutation({
    mutationFn: (input: CreatePollInput) => questionsApi.createPoll(input),
    onSuccess: (question) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all })
      void sendNewQuestionEmail(question.id).catch((err) => {
        const message = err instanceof Error ? err.message : 'Mail versturen mislukt'
        warning('Mail niet verstuurd', message)
      })
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

export function useUpdatePollDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdatePollDraftInput & { id: string }) =>
      questionsApi.updatePollDraft(id, input),
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
