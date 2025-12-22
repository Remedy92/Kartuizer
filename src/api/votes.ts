import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Vote, VoteType } from '@/types'

function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is niet geconfigureerd. Stel VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in.')
  }
}

export const votesApi = {
  // Cast a standard yes/no/abstain vote
  async cast(questionId: string, vote: VoteType, userId: string): Promise<Vote> {
    ensureSupabaseConfigured()
    // Use upsert to handle both new votes and vote changes
    const { data, error } = await supabase
      .from('votes')
      .upsert(
        {
          question_id: questionId,
          vote,
          user_id: userId,
          poll_option_id: null,
        },
        {
          onConflict: 'question_id,user_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Cast a poll vote (single choice)
  async castPollVote(questionId: string, optionId: string, userId: string): Promise<Vote> {
    ensureSupabaseConfigured()
    // For single-choice polls, upsert to replace any existing vote
    const { data, error } = await supabase
      .from('votes')
      .upsert(
        {
          question_id: questionId,
          poll_option_id: optionId,
          user_id: userId,
          vote: null,
        },
        {
          onConflict: 'question_id,user_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Cast multiple poll votes (multi-choice)
  async castMultiplePollVotes(
    questionId: string,
    optionIds: string[],
    userId: string
  ): Promise<Vote[]> {
    ensureSupabaseConfigured()

    // First, delete existing votes for this user on this question
    await supabase
      .from('votes')
      .delete()
      .eq('question_id', questionId)
      .eq('user_id', userId)

    // Insert new votes for each selected option
    const votesToInsert = optionIds.map(optionId => ({
      question_id: questionId,
      poll_option_id: optionId,
      user_id: userId,
      vote: null,
    }))

    const { data, error } = await supabase
      .from('votes')
      .insert(votesToInsert)
      .select()

    if (error) throw error
    return data ?? []
  },

  // Get user's poll votes for a question (may be multiple for multi-choice)
  async getUserPollVotes(questionId: string, userId: string): Promise<Vote[]> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('question_id', questionId)
      .eq('user_id', userId)
      .not('poll_option_id', 'is', null)

    if (error) throw error
    return data ?? []
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
