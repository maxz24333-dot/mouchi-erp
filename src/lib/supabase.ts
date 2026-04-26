import { createClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>

let _client: AnySupabase | null = null

export function getSupabaseClient(): AnySupabase {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url === 'your_supabase_url_here') {
    throw new Error('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  }
  _client = createClient(url, key)
  return _client
}

// Convenience alias — call this inside route handlers (not at module level)
export const supabase = new Proxy({} as AnySupabase, {
  get(_t, prop) {
    return getSupabaseClient()[prop as keyof AnySupabase]
  },
})
