import { z } from 'zod'
import { formatApiError, renderSupabaseAdmin } from './_renderSupabase.js'

const QuerySchema = z.object({ id: z.string().min(8) })

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).send('Method not allowed')
    return
  }
  try {
    const q = QuerySchema.parse(req.query || {})
    const supabase = renderSupabaseAdmin()
    const { data, error } = await supabase
      .from('render_jobs')
      .select('id,status,progress,stage,video_url,error,updated_at')
      .eq('id', q.id)
      .single()
    if (error) throw error
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: formatApiError(e) })
  }
}

