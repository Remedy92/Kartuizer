import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { ActivityLog } from '@/types'

export interface AnalyticsStats {
  totalQuestions: number
  openQuestions: number
  completedQuestions: number
  totalVotes: number
  totalUsers: number
  totalGroups: number
  participationRate: number
}

export const analyticsApi = {
  async getStats(): Promise<AnalyticsStats> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is niet geconfigureerd. Stel VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in.')
    }
    const [questionsResult, votesResult, usersResult, groupsResult] = await Promise.all([
      supabase.from('questions').select('status'),
      supabase.from('votes').select('id', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('groups').select('id', { count: 'exact', head: true }),
    ])

    const questions = questionsResult.data ?? []
    const openQuestions = questions.filter((q) => q.status === 'open').length
    const completedQuestions = questions.filter((q) => q.status === 'completed').length

    return {
      totalQuestions: questions.length,
      openQuestions,
      completedQuestions,
      totalVotes: votesResult.count ?? 0,
      totalUsers: usersResult.count ?? 0,
      totalGroups: groupsResult.count ?? 0,
      participationRate: 0, // TODO: Calculate actual participation rate
    }
  },

  async getRecentActivity(limit = 20): Promise<ActivityLog[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is niet geconfigureerd. Stel VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in.')
    }
    const { data, error } = await supabase
      .from('activity_log')
      .select('*, user_profiles(email, display_name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data ?? []
  },

  async logActivity(
    action: string,
    entityType: string,
    entityId?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    if (!isSupabaseConfigured) {
      return
    }
    const { error } = await supabase.from('activity_log').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    })

    if (error) console.error('Failed to log activity:', error)
  },
}
