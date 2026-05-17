import { z } from 'zod'
import { createJsonHandler } from './_lib/http.js'
import { renderJobIdSchema, renderSupabaseAdmin, requireWorkerToken } from './_renderSupabase.js'

const BodySchema = z.object({
  id: renderJobIdSchema,
  progress: z.number().int().min(0).max(100),
  stage: z.string().max(200).optional()
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  authorize: requireWorkerToken,
  async run({ body }) {
    const supabase = renderSupabaseAdmin()
    const { error } = await supabase
      .from('render_jobs')
      .update({ progress: body.progress, stage: body.stage ?? '' })
      .eq('id', body.id)
    if (error) throw error
    return { ok: true }
  }
})
