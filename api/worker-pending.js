import { renderSupabaseAdmin, requireWorkerToken } from './_renderSupabase.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).send('Method not allowed')
    return
  }
  try {
    requireWorkerToken(req)
    const supabase = renderSupabaseAdmin()
    const { data, error } = await supabase
      .from('render_jobs')
      .select('id,status,payload')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
    if (error) throw error
    res.status(200).json({ job: data?.[0] ?? null })
  } catch (e) {
    res.status(e?.status || 500).json({ error: e instanceof Error ? e.message : String(e) })
  }
}

