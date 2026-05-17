import { createClient } from '@supabase/supabase-js'

export function supabaseFromReq(req) {
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase env missing (SUPABASE_URL / SUPABASE_ANON_KEY).')
  const auth = req.headers?.authorization || ''
  return createClient(url, anon, {
    global: { headers: auth ? { Authorization: auth } : {} },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  })
}
