import { z } from 'zod'
import { formatApiError, renderSupabaseAdmin } from './_renderSupabase.js'

const BodySchema = z.object({
  storyTitle: z.string().optional(),
  images: z.array(z.string().url()).min(1),
  audio: z.string().url().optional(),
  subtitles: z
    .array(
      z.object({
        startMs: z.number().int().min(0),
        endMs: z.number().int().min(1),
        text: z.string().min(1)
      })
    )
    .optional(),
  fps: z.number().int().min(24).max(60).optional(),
  secondsPerImage: z.number().min(1).max(15).optional()
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).send('Method not allowed')
    return
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}
    const payload = BodySchema.parse(body)
    const supabase = renderSupabaseAdmin()

    const { data, error } = await supabase
      .from('render_jobs')
      .insert({
        status: 'queued',
        progress: 0,
        stage: 'queued',
        payload
      })
      .select('id')
      .single()
    if (error) throw error
    res.status(200).json({ jobId: data.id })
  } catch (e) {
    res.status(500).json({ error: formatApiError(e) })
  }
}

