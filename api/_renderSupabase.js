import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

/**
 * `render_jobs.id`: uuid string, or short numeric string when the PK is bigint/serial.
 * Do not use `.min(8)` here — the worker sends `String(id)` and small ids are valid.
 */
export const renderJobIdSchema = z
  .union([z.string(), z.number(), z.bigint()])
  .transform((v) => String(v).trim())
  .pipe(z.string().min(1).max(128))

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

export function formatApiError(e) {
  let msg = ''
  if (e instanceof Error) msg = e.message
  else if (e && typeof e === 'object' && typeof e.message === 'string' && e.message) msg = e.message
  else if (e && typeof e === 'object') {
    try {
      msg = JSON.stringify(e)
    } catch {
      msg = String(e)
    }
  } else msg = String(e)

  if (/render_jobs/i.test(msg) && /progress/i.test(msg) && /schema cache/i.test(msg)) {
    return (
      'Supabase table render_jobs is missing the progress column (or the API cache is stale). ' +
      'In Supabase: SQL Editor → run the file supabase/render_jobs_add_missing_columns.sql from this repo. ' +
      'Then wait 60 seconds and try Generate Video again. If it persists: Dashboard → Settings → API → restart project or contact support to reload schema.'
    )
  }
  return msg
}

