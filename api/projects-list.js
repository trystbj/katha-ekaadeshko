import { createClient } from '@supabase/supabase-js'

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
    const supabase = supabaseFromReq(req)
    const { data, error } = await supabase
      .from('projects')
      .select('id,title,status,updated_at')
      .order('updated_at', { ascending: false })
      .limit(200)
    if (error) throw error
    res.status(200).json(
      (data || []).map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        updatedAt: p.updated_at
      }))
    )
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
}

