
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // During static build, these may be undefined. Only throw when actually called at runtime.
  if (!url || !anon) {
    throw new Error('Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }
  client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  })
  return client
}
