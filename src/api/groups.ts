import { supabase } from '@/lib/supabase'
import type { Group, GroupMember } from '@/types'

export interface CreateGroupInput {
  name: string
  description?: string
  required_votes: number
}

export interface UpdateGroupInput {
  name?: string
  description?: string
  required_votes?: number
}

export const groupsApi = {
  async getAll(): Promise<Group[]> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Group | null> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  async create(input: CreateGroupInput): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, input: UpdateGroupInput): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (error) throw error
  },

  async getMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('*, user_profiles(*)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async addMember(groupId: string, userId: string, role: 'member' | 'chair' | 'admin' = 'member'): Promise<GroupMember> {
    const { data, error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) throw error
  },

  async updateMemberRole(groupId: string, userId: string, role: 'member' | 'chair' | 'admin'): Promise<GroupMember> {
    const { data, error } = await supabase
      .from('group_members')
      .update({ role })
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },
}
