import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const BodySchema = z.object({ id: z.string().min(8) })

function supabaseFromReq(req) {
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase env missing (SUPABASE_URL / SUPABASE_ANON_KEY).')
  const auth = req.headers?.authorization || ''
  return createClient(url, anon, {
    global: { headers: auth ? { Authorization: auth } : {} },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).send('Method not allowed')
    return
  }
  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body ?? {}
    const { id } = BodySchema.parse(body)
    const supabase = supabaseFromReq(req)

    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
}

