import { apiFetch } from '@/lib/api'
import type { Group, GroupMember } from '@/types'

export interface CreateGroupInput {
  name: string
  description?: string
  email_subject_tag?: string
}

export interface UpdateGroupInput {
  name?: string
  description?: string
  email_subject_tag?: string
}

function normalizeEmailSubjectTag(value?: string): string | null | undefined {
  if (value === undefined) return undefined

  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const withoutBrackets = trimmed.slice(1, -1).trim()
    return withoutBrackets ? withoutBrackets : null
  }

  return trimmed
}

export const groupsApi = {
  async getAll(): Promise<Group[]> {
    return apiFetch<Group[]>('/api/groups')
  },

  async getAllMembers(): Promise<GroupMember[]> {
    return apiFetch<GroupMember[]>('/api/group-members')
  },

  async getById(id: string): Promise<Group | null> {
    return apiFetch<Group | null>(`/api/groups/${id}`)
  },

  async create(input: CreateGroupInput): Promise<Group> {
    return apiFetch<Group>('/api/groups', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        email_subject_tag: normalizeEmailSubjectTag(input.email_subject_tag),
      }),
    })
  },

  async update(id: string, input: UpdateGroupInput): Promise<Group> {
    return apiFetch<Group>(`/api/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...input,
        email_subject_tag: normalizeEmailSubjectTag(input.email_subject_tag),
      }),
    })
  },

  async delete(id: string): Promise<void> {
    return apiFetch<void>(`/api/groups/${id}`, { method: 'DELETE' })
  },

  async getMembers(groupId: string): Promise<GroupMember[]> {
    return apiFetch<GroupMember[]>(`/api/groups/${groupId}/members`)
  },

  async addMember(groupId: string, userId: string): Promise<GroupMember> {
    return apiFetch<GroupMember>(`/api/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    return apiFetch<void>(`/api/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    })
  },
}
