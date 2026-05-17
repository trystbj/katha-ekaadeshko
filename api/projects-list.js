import { createJsonHandler } from './_lib/http.js'
import { supabaseFromReq } from './_lib/projectsSupabase.js'

export default createJsonHandler({
  methods: ['GET'],
  rateLimit: { max: 60, windowMs: 60_000 },
  async run({ req }) {
    const supabase = supabaseFromReq(req)
    const { data, error } = await supabase
      .from('projects')
      .select('id,title,status,updated_at')
      .order('updated_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return (data || []).map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      updatedAt: p.updated_at
    }))
  }
})
