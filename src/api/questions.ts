import { supabase } from '@/lib/supabase'
import type { Question, QuestionStatus, CompletionMethod } from '@/types'

export interface CreateQuestionInput {
  title: string
  description?: string
  group_id: string
  deadline?: string
}

export interface UpdateQuestionInput {
  title?: string
  description?: string
  deadline?: string
}

export const questionsApi = {
  async getByStatus(status: QuestionStatus): Promise<Question[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('*, groups(id, name, required_votes), votes(id, question_id, user_id, vote, created_at)')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Question | null> {
    const { data, error } = await supabase
      .from('questions')
      .select('*, groups(id, name, required_votes), votes(id, question_id, user_id, vote, created_at)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  async getAll(): Promise<Question[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('*, groups(id, name, required_votes), votes(id, question_id, user_id, vote, created_at)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async create(input: CreateQuestionInput): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .insert({
        ...input,
        status: 'open' as QuestionStatus,
      })
      .select('*, groups(id, name, required_votes)')
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, input: UpdateQuestionInput): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, groups(id, name, required_votes)')
      .single()

    if (error) throw error
    return data
  },

  async close(id: string, method: CompletionMethod = 'manual'): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .update({
        status: 'completed' as QuestionStatus,
        completed_at: new Date().toISOString(),
        completion_method: method,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, groups(id, name, required_votes)')
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) throw error
  },
}
