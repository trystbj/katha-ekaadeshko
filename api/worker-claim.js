import { z } from 'zod'
import { createJsonHandler } from './_lib/http.js'
import { renderJobIdSchema, renderSupabaseAdmin, requireWorkerToken } from './_renderSupabase.js'

const BodySchema = z.object({ id: renderJobIdSchema, workerId: z.string().min(1).max(128) })

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  authorize: requireWorkerToken,
  async run({ body }) {
    const supabase = renderSupabaseAdmin()
    const { data, error } = await supabase
      .from('render_jobs')
      .update({ status: 'running', stage: 'claimed', progress: 1, worker_id: body.workerId })
      .eq('id', body.id)
      .eq('status', 'queued')
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      const err = new Error('Already claimed')
      err.status = 409
      throw err
    }
    return { ok: true }
  }
})
