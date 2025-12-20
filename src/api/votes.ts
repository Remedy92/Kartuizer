import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Vote, VoteType } from '@/types'

function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is niet geconfigureerd. Stel VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in.')
  }
}

export const votesApi = {
  async cast(questionId: string, vote: VoteType, userId: string): Promise<Vote> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('votes')
      .insert({
        question_id: questionId,
        vote,
        user_id: userId,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Je hebt al gestemd op deze vraag.')
      }
      throw error
    }
    return data
  },

  async getByQuestion(questionId: string): Promise<Vote[]> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('question_id', questionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async getByUser(userId: string): Promise<Vote[]> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async getUserVoteForQuestion(questionId: string, userId: string): Promise<Vote | null> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('question_id', questionId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },
}
