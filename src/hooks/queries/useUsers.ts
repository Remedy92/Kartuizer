import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type UpdateUserProfileInput } from '@/api'

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: () => [...userKeys.lists()] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  groups: (id: string) => [...userKeys.detail(id), 'groups'] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => usersApi.getAll(),
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  })
}

export function useUserGroups(userId: string) {
  return useQuery({
    queryKey: userKeys.groups(userId),
    queryFn: () => usersApi.getGroups(userId),
    enabled: !!userId,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserProfileInput & { id: string }) =>
      usersApi.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) })
    },
  })
}
