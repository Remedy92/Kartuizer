import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { VoteComment } from '@/types'

function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is niet geconfigureerd. Stel VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in.')
  }
}

export const voteCommentsApi = {
  async upsert(questionId: string, userId: string, comment: string): Promise<VoteComment> {
    ensureSupabaseConfigured()

    const trimmed = comment.trim()
    if (!trimmed) {
      throw new Error('Commentaar is leeg.')
    }

    const { data, error } = await supabase
      .from('vote_comments')
      .upsert(
        {
          question_id: questionId,
          user_id: userId,
          comment: trimmed,
        },
        { onConflict: 'question_id,user_id' }
      )
      .select('id, question_id, user_id, comment, created_at, updated_at')
      .single()

    if (error) throw error
    return data as VoteComment
  },

  async remove(questionId: string, userId: string): Promise<void> {
    ensureSupabaseConfigured()
    const { error } = await supabase
      .from('vote_comments')
      .delete()
      .eq('question_id', questionId)
      .eq('user_id', userId)

    if (error) throw error
  },
}

