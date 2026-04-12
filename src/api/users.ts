import { apiFetch } from '@/lib/api'
import type { UserProfile, UserRole, GroupMember } from '@/types'

export interface UpdateUserProfileInput {
  display_name?: string
  role?: UserRole
}

export interface ApproveUserInput {
  id: string
}

export interface ApproveUserResult {
  profile: UserProfile
  emailSent: boolean
  emailError?: string
}

export const usersApi = {
  async getAll(): Promise<UserProfile[]> {
    return apiFetch<UserProfile[]>('/api/users')
  },

  async getById(id: string): Promise<UserProfile | null> {
    return apiFetch<UserProfile | null>(`/api/users/${id}`)
  },

  async update(id: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    return apiFetch<UserProfile>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  async getGroups(userId: string): Promise<GroupMember[]> {
    return apiFetch<GroupMember[]>(`/api/users/${userId}/groups`)
  },

  async updateLastActive(userId: string): Promise<void> {
    await apiFetch<void>(`/api/users/${userId}/last-active`, { method: 'PATCH' }).catch(() => undefined)
  },

  async getPending(): Promise<UserProfile[]> {
    return apiFetch<UserProfile[]>('/api/users/pending/list')
  },

  async getPendingCount(): Promise<number> {
    return apiFetch<number>('/api/users/pending/count')
  },

  async approve(id: string): Promise<ApproveUserResult> {
    return apiFetch<ApproveUserResult>(`/api/users/${id}/approve`, { method: 'POST' })
  },

  async reject(id: string): Promise<void> {
    return apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' })
  },
}
