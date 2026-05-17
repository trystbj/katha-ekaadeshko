import { z } from 'zod'
import { createJsonHandler } from './_lib/http.js'
import { renderJobIdSchema, renderSupabaseAdmin } from './_renderSupabase.js'

const QuerySchema = z.object({ id: renderJobIdSchema })

export default createJsonHandler({
  methods: ['GET'],
  input: 'query',
  schema: QuerySchema,
  rateLimit: { max: 120, windowMs: 60_000 },
  async run({ body }) {
    const supabase = renderSupabaseAdmin()
    const { data, error } = await supabase
      .from('render_jobs')
      .select('id,status,progress,stage,video_url,error,updated_at')
      .eq('id', body.id)
      .single()
    if (error) throw error
    return data
  }
})
