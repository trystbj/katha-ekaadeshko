import { z } from 'zod'
import { createJsonHandler } from '../_lib/http.js'
import { renderJobIdSchema, renderSupabaseAdmin, requireWorkerToken } from '../_renderSupabase.js'

const BodySchema = z.object({
  id: renderJobIdSchema,
  videoUrl: z.string().url()
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  authorize: requireWorkerToken,
  async run({ body }) {
    const supabase = renderSupabaseAdmin()
    const { error } = await supabase
      .from('render_jobs')
      .update({
        status: 'done',
        progress: 100,
        stage: 'done',
        video_url: body.videoUrl,
        error: null
      })
      .eq('id', body.id)
    if (error) throw error
    return { ok: true }
  }
})
