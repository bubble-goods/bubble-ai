import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

export interface SupabaseConfig {
  url: string
  anonKey: string
}

/**
 * Initialize the Supabase client.
 * Call this once at application startup.
 */
export function initSupabase(config: SupabaseConfig): SupabaseClient {
  supabaseClient = createClient(config.url, config.anonKey)
  return supabaseClient
}

/**
 * Get the initialized Supabase client.
 * Throws if not initialized.
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error(
      'Supabase client not initialized. Call initSupabase() first.',
    )
  }
  return supabaseClient
}

/**
 * Initialize Supabase from environment variables.
 * Expects SUPABASE_URL and SUPABASE_ANON_KEY.
 */
export function initSupabaseFromEnv(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables',
    )
  }

  return initSupabase({ url, anonKey })
}
