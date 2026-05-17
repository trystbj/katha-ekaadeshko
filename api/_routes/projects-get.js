import { z } from 'zod'
import { createJsonHandler } from '../_lib/http.js'
import { supabaseFromReq } from '../_lib/projectsSupabase.js'

const QuerySchema = z.object({ id: z.string().min(8) })

export default createJsonHandler({
  methods: ['GET'],
  input: 'query',
  schema: QuerySchema,
  rateLimit: { max: 120, windowMs: 60_000 },
  async run({ body, req }) {
    const supabase = supabaseFromReq(req)
    const { data, error } = await supabase
      .from('projects')
      .select('project_json')
      .eq('id', body.id)
      .single()
    if (error) throw error
    return data?.project_json ?? null
  }
})
