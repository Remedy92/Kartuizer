import { apiFetch } from '@/lib/api'
import type { AppSettings } from '@/types'

export interface UpdateAppSettingsInput {
  require_user_approval?: boolean
}

export const settingsApi = {
  async get(): Promise<AppSettings | null> {
    return apiFetch<AppSettings | null>('/api/settings')
  },

  async update(input: UpdateAppSettingsInput): Promise<AppSettings> {
    return apiFetch<AppSettings>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },
}
