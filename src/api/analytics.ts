import { apiFetch, apiUrl } from '@/lib/api'
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
    return apiFetch<AnalyticsStats>('/api/analytics/stats')
  },

  async getRecentActivity(limit = 20): Promise<ActivityLog[]> {
    return apiFetch<ActivityLog[]>(`/api/analytics/activity?limit=${limit}`)
  },

  async logActivity(
    action: string,
    entityType: string,
    entityId?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    void fetch(apiUrl('/api/analytics/activity'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, entityType, entityId, metadata }),
    }).catch(() => undefined)
  },
}
