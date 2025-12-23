import { supabase } from '@/lib/supabase'
import type { AppSettings } from '@/types'

export interface UpdateAppSettingsInput {
  require_user_approval?: boolean
}

export const settingsApi = {
  async get(): Promise<AppSettings | null> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  },

  async update(input: UpdateAppSettingsInput): Promise<AppSettings> {
    // First, try to update existing settings
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('app_settings')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    }

    // If no settings exist, create them (shouldn't happen normally as migration creates default)
    const { data, error } = await supabase
      .from('app_settings')
      .insert({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  },
}
