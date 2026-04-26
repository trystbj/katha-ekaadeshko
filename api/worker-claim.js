import { z } from 'zod'
import { formatApiError, renderSupabaseAdmin, requireWorkerToken } from './_renderSupabase.js'

const BodySchema = z.object({ id: z.string().min(8), workerId: z.string().min(1).max(128) })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).send('Method not allowed')
    return
  }
  try {
    requireWorkerToken(req)
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}
    const input = BodySchema.parse(body)

    const supabase = renderSupabaseAdmin()
    const { data, error } = await supabase
      .from('render_jobs')
      .update({ status: 'running', stage: 'claimed', progress: 1, worker_id: input.workerId })
      .eq('id', input.id)
      .eq('status', 'queued')
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      res.status(409).json({ ok: false, message: 'Already claimed' })
      return
    }
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(e?.status || 500).json({ error: formatApiError(e) })
  }
}

