import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi, type CreateGroupInput, type UpdateGroupInput } from '@/api'


export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: () => [...groupKeys.lists()] as const,
  details: () => [...groupKeys.all, 'detail'] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
  members: (id: string) => [...groupKeys.detail(id), 'members'] as const,
  allMembers: () => [...groupKeys.all, 'all-members'] as const,
}

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: () => groupsApi.getAll(),
  })
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: groupKeys.detail(id),
    queryFn: () => groupsApi.getById(id),
    enabled: !!id,
  })
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: groupKeys.members(groupId),
    queryFn: () => groupsApi.getMembers(groupId),
    enabled: !!groupId,
  })
}

export function useAllGroupMembers() {
  return useQuery({
    queryKey: groupKeys.allMembers(),
    queryFn: () => groupsApi.getAllMembers(),
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateGroupInput) => groupsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateGroupInput & { id: string }) =>
      groupsApi.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(variables.id) })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}

export function useAddGroupMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      groupId,
      userId,
    }: {
      groupId: string
      userId: string
    }) => groupsApi.addMember(groupId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.members(variables.groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.allMembers() })
    },
  })
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupsApi.removeMember(groupId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.members(variables.groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.allMembers() })
    },
  })
}


