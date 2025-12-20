import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error('Missing Supabase environment variables')
}

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 12000)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

const globalForSupabase = globalThis as unknown as { __supabase?: SupabaseClient }

export const supabase =
  globalForSupabase.__supabase ??
  createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Auto-handles URL tokens for password reset
      flowType: 'implicit', // SPA uses implicit flow
    },
    global: {
      fetch: fetchWithTimeout,
    },
  })

if (import.meta.env.DEV) {
  globalForSupabase.__supabase = supabase
}
