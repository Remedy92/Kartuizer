import { supabase } from '@/lib/supabase'
import type { UserProfile, UserRole, GroupMember } from '@/types'

export interface UpdateUserProfileInput {
  display_name?: string
  role?: UserRole
}

export const usersApi = {
  async getAll(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('email', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  async update(id: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getGroups(userId: string): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', userId)

    if (error) throw error
    return data ?? []
  },

  async updateLastActive(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) console.error('Failed to update last active:', error)
  },
}
