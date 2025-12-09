import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const TAXONOMY_SCHEMA = 'taxonomy'

// Use generic SupabaseClient type to allow any schema
// biome-ignore lint/suspicious/noExplicitAny: Supabase client schema typing is complex
type TaxonomyClient = SupabaseClient<any, typeof TAXONOMY_SCHEMA>

let supabaseClient: TaxonomyClient | null = null

export interface SupabaseConfig {
  url: string
  anonKey: string
}

/**
 * Initialize the Supabase client.
 * Call this once at application startup.
 */
export function initSupabase(config: SupabaseConfig): TaxonomyClient {
  supabaseClient = createClient(config.url, config.anonKey, {
    db: { schema: TAXONOMY_SCHEMA },
  })
  return supabaseClient
}

/**
 * Get the initialized Supabase client.
 * Throws if not initialized.
 */
export function getSupabase(): TaxonomyClient {
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
export function initSupabaseFromEnv(): TaxonomyClient {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables',
    )
  }

  return initSupabase({ url, anonKey })
}
