import { z } from 'zod'
import { createJsonHandler } from '../_lib/http.js'
import { renderJobIdSchema, renderSupabaseAdmin, requireWorkerToken } from '../_renderSupabase.js'

const BodySchema = z.object({
  id: renderJobIdSchema,
  error: z.string().min(1).max(2000)
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
        status: 'failed',
        progress: 0,
        stage: 'failed',
        error: body.error,
        video_url: null
      })
      .eq('id', body.id)
    if (error) throw error
    return { ok: true }
  }
})
