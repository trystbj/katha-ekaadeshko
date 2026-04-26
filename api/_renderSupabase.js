import { createClient } from '@supabase/supabase-js'

export function renderSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  })
}

export function requireWorkerToken(req) {
  const expected = process.env.WORKER_TOKEN
  const got = String(req.headers?.['x-worker-token'] || '')
  if (!expected || got !== expected) {
    const err = new Error('Unauthorized worker')
    err.status = 401
    throw err
  }
}

