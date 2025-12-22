import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Question, QuestionStatus, CompletionMethod, QuestionType } from '@/types'

function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is niet geconfigureerd. Stel VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in.')
  }
}

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

// Select query with all relations
// Note: poll_options!question_id uses FK hint to avoid PostgREST 300 ambiguous relationship error
const QUESTION_SELECT = `
  *,
  groups(id, name, required_votes),
  votes(id, question_id, user_id, vote, poll_option_id, created_at),
  poll_options!question_id(id, question_id, label, description, sort_order, created_at)
`

export const questionsApi = {
  async getByStatus(status: QuestionStatus): Promise<Question[]> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('questions')
      .select(QUESTION_SELECT)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Question | null> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('questions')
      .select(QUESTION_SELECT)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  async getAll(): Promise<Question[]> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('questions')
      .select(QUESTION_SELECT)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async create(input: CreateQuestionInput): Promise<Question> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('questions')
      .insert({
        title: input.title,
        description: input.description,
        group_id: input.group_id,
        deadline: input.deadline,
        question_type: input.question_type || 'standard',
        allow_multiple: input.allow_multiple || false,
        status: 'open' as QuestionStatus,
      })
      .select(QUESTION_SELECT)
      .single()

    if (error) throw error
    return data
  },

  async createPoll(input: CreatePollInput): Promise<Question> {
    ensureSupabaseConfigured()

    // Create the question first
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .insert({
        title: input.title,
        description: input.description,
        group_id: input.group_id,
        deadline: input.deadline,
        question_type: 'poll',
        allow_multiple: input.allow_multiple || false,
        status: 'open' as QuestionStatus,
      })
      .select()
      .single()

    if (questionError) throw questionError

    // Create the poll options
    const optionsToInsert = input.options.map((opt, index) => ({
      question_id: question.id,
      label: opt.label,
      description: opt.description,
      sort_order: index,
    }))

    const { error: optionsError } = await supabase
      .from('poll_options')
      .insert(optionsToInsert)

    if (optionsError) {
      // Rollback: delete the question if options fail
      await supabase.from('questions').delete().eq('id', question.id)
      throw optionsError
    }

    // Return the full question with relations
    return this.getById(question.id) as Promise<Question>
  },

  async update(id: string, input: UpdateQuestionInput): Promise<Question> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('questions')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(QUESTION_SELECT)
      .single()

    if (error) throw error
    return data
  },

  async close(id: string, method: CompletionMethod = 'manual'): Promise<Question> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('questions')
      .update({
        status: 'completed' as QuestionStatus,
        completed_at: new Date().toISOString(),
        completion_method: method,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(QUESTION_SELECT)
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    ensureSupabaseConfigured()
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) throw error
  },
}
