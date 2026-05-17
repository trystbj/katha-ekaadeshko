import { z } from 'zod'
import { createJsonHandler } from './_lib/http.js'
import { renderSupabaseAdmin } from './_renderSupabase.js'

const BodySchema = z.object({
  storyTitle: z.string().optional(),
  images: z.array(z.string().url()).min(1),
  audio: z.string().url().optional(),
  backgroundMusic: z.string().url().optional(),
  storyAudioPlan: z.any().optional(),
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

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 20, windowMs: 60_000 },
  async run({ body }) {
    const supabase = renderSupabaseAdmin()
    const { data, error } = await supabase
      .from('render_jobs')
      .insert({
        status: 'queued',
        progress: 0,
        stage: 'queued',
        payload: body
      })
      .select('id')
      .single()
    if (error) throw error
    return { jobId: data.id }
  }
})
