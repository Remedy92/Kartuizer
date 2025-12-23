import { supabase, supabaseUrl } from '@/lib/supabase'
import type { UserProfile, UserRole, GroupMember } from '@/types'

export interface UpdateUserProfileInput {
  display_name?: string
  role?: UserRole
}

export interface ApproveUserInput {
  id: string
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

  async getPending(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async getPendingCount(): Promise<number> {
    const { count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'pending')

    if (error) throw error
    return count ?? 0
  },

  async approve(id: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        approval_status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async reject(id: string): Promise<void> {
    // Call the delete-user Edge Function to delete from auth.users
    // This requires service role, so we use an Edge Function
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('Niet ingelogd')
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId: id }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Gebruiker verwijderen mislukt')
    }
  },
}
