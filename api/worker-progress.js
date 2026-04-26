import { z } from 'zod'
import {
  formatApiError,
  renderJobIdSchema,
  renderSupabaseAdmin,
  requireWorkerToken
} from './_renderSupabase.js'

const BodySchema = z.object({
  id: renderJobIdSchema,
  progress: z.number().int().min(0).max(100),
  stage: z.string().max(200).optional()
})

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
    const { error } = await supabase
      .from('render_jobs')
      .update({ progress: input.progress, stage: input.stage ?? '' })
      .eq('id', input.id)
    if (error) throw error
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(e?.status || 500).json({ error: formatApiError(e) })
  }
}

