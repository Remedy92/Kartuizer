import { apiFetch } from '@/lib/api'
import type { Question, QuestionStatus, CompletionMethod, QuestionType } from '@/types'

export interface CreateQuestionInput {
  title: string
  description?: string
  group_id: string
  deadline?: string
  question_type?: QuestionType
  allow_multiple?: boolean
}

export interface CreatePollInput extends CreateQuestionInput {
  question_type: 'poll'
  options: { label: string; description?: string }[]
}

export interface UpdateQuestionInput {
  title?: string
  description?: string
  deadline?: string
}

export interface UpdatePollDraftInput {
  title: string
  description?: string | null
  options: { label: string; description?: string }[]
}

export const questionsApi = {
  async getByStatus(status: QuestionStatus): Promise<Question[]> {
    return apiFetch<Question[]>(`/api/questions/status/${status}`)
  },

  async getById(id: string): Promise<Question | null> {
    return apiFetch<Question | null>(`/api/questions/${id}`)
  },

  async getAll(): Promise<Question[]> {
    return apiFetch<Question[]>('/api/questions')
  },

  async create(input: CreateQuestionInput): Promise<Question> {
    return apiFetch<Question>('/api/questions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async createPoll(input: CreatePollInput): Promise<Question> {
    return apiFetch<Question>('/api/questions/polls', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async update(id: string, input: UpdateQuestionInput): Promise<Question> {
    return apiFetch<Question>(`/api/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  async updatePollDraft(id: string, input: UpdatePollDraftInput): Promise<Question> {
    return apiFetch<Question>(`/api/questions/${id}/poll-draft`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  async close(id: string, method: CompletionMethod = 'manual'): Promise<Question> {
    return apiFetch<Question>(`/api/questions/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ method }),
    })
  },

  async delete(id: string): Promise<void> {
    return apiFetch<void>(`/api/questions/${id}`, { method: 'DELETE' })
  },
}
