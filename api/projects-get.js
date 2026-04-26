import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const QuerySchema = z.object({ id: z.string().min(8) })

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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).send('Method not allowed')
    return
  }
  try {
    const q = QuerySchema.parse(req.query || {})
    const supabase = supabaseFromReq(req)
    const { data, error } = await supabase
      .from('projects')
      .select('project_json')
      .eq('id', q.id)
      .single()
    if (error) throw error
    res.status(200).json(data?.project_json ?? null)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
}

