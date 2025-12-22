import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Group, GroupMember } from '@/types'

function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is niet geconfigureerd. Stel VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in.')
  }
}

export interface CreateGroupInput {
  name: string
  description?: string
}

export interface UpdateGroupInput {
  name?: string
  description?: string
}

export const groupsApi = {
  async getAll(): Promise<Group[]> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async getAllMembers(): Promise<GroupMember[]> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('group_members')
      .select('*, user_profiles(*)')
      .order('joined_at', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Group | null> {
    ensureSupabaseConfigured()
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
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('groups')
      .insert({
        ...input,
        required_votes: 0 // Trigger will update this when members are added
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, input: UpdateGroupInput): Promise<Group> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('groups')
      .update({
        name: input.name,
        description: input.description,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    ensureSupabaseConfigured()
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (error) throw error
  },

  async getMembers(groupId: string): Promise<GroupMember[]> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('group_members')
      .select('*, user_profiles(*)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async addMember(groupId: string, userId: string): Promise<GroupMember> {
    ensureSupabaseConfigured()
    const { data, error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    ensureSupabaseConfigured()
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) throw error
  },


}
