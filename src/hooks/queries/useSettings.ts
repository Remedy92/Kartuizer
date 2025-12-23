import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, type UpdateAppSettingsInput } from '@/api'

export const settingsKeys = {
  all: ['settings'] as const,
}

export function useAppSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => settingsApi.get(),
  })
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateAppSettingsInput) => settingsApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}
