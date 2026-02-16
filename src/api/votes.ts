import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Vote, VoteType } from '@/types'

function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is niet geconfigureerd. Stel VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in.')
  }
}

function isUniqueConstraintError(error: unknown, constraintName: string) {
  if (!error || typeof error !== 'object') return false

  const dbError = error as { code?: string; message?: string; details?: string | null }
  if (dbError.code !== '23505') return false

  const combinedMessage = `${dbError.message ?? ''} ${dbError.details ?? ''}`.toLowerCase()
  return combinedMessage.includes(constraintName.toLowerCase())
}

export const votesApi = {
  // Cast a standard yes/no/abstain vote
  async cast(questionId: string, vote: VoteType, userId: string): Promise<Vote> {
    ensureSupabaseConfigured()
    // Update-first avoids delete+insert race conditions on fast double clicks/retries.
    const { data: updatedVote, error: updateError } = await supabase
      .from('votes')
      .update({ vote })
      .eq('question_id', questionId)
      .eq('user_id', userId)
      .is('poll_option_id', null)
      .select()
      .maybeSingle()
    if (updateError) throw updateError
    if (updatedVote) return updatedVote

    // No existing row yet: insert first vote.
    const { data, error } = await supabase
      .from('votes')
      .insert({
        question_id: questionId,
        vote,
        user_id: userId,
        poll_option_id: null,
      })
      .select()
      .single()

    // Handle concurrent insert from another in-flight request gracefully.
    if (error && isUniqueConstraintError(error, 'votes_unique_standard')) {
      const { data: retriedVote, error: retryError } = await supabase
        .from('votes')
        .update({ vote })
        .eq('question_id', questionId)
        .eq('user_id', userId)
        .is('poll_option_id', null)
        .select()
        .maybeSingle()

      if (retryError) throw retryError
      if (retriedVote) return retriedVote
    }

    if (error) throw error
    return data
  },

  // Cast a poll vote (single choice)
  async castPollVote(questionId: string, optionId: string, userId: string): Promise<Vote> {
    ensureSupabaseConfigured()
    // For single-choice polls, replace any existing vote
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('question_id', questionId)
      .eq('user_id', userId)
    if (deleteError) throw deleteError

    const { data, error } = await supabase
      .from('votes')
      .insert({
        question_id: questionId,
        poll_option_id: optionId,
        user_id: userId,
        vote: null,
      })
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
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('question_id', questionId)
      .eq('user_id', userId)
    if (deleteError) throw deleteError

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
