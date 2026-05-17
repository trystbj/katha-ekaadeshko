import { z } from 'zod'
import { createJsonHandler } from '../_lib/http.js'
import { supabaseFromReq } from '../_lib/projectsSupabase.js'

const BodySchema = z.object({ id: z.string().min(8) })

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 40, windowMs: 60_000 },
  async run({ body, req }) {
    const supabase = supabaseFromReq(req)
    const { error } = await supabase.from('projects').delete().eq('id', body.id)
    if (error) throw error
    return { ok: true }
  }
})
