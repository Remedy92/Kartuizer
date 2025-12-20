import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/api'

export const analyticsKeys = {
  all: ['analytics'] as const,
  stats: () => [...analyticsKeys.all, 'stats'] as const,
  activity: () => [...analyticsKeys.all, 'activity'] as const,
}

export function useAnalyticsStats() {
  return useQuery({
    queryKey: analyticsKeys.stats(),
    queryFn: () => analyticsApi.getStats(),
    staleTime: 60_000, // 1 minute
  })
}

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: [...analyticsKeys.activity(), limit],
    queryFn: () => analyticsApi.getRecentActivity(limit),
    staleTime: 30_000, // 30 seconds
  })
}
