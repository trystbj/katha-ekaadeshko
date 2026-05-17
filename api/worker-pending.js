import { createJsonHandler } from './_lib/http.js'
import { renderSupabaseAdmin, requireWorkerToken } from './_renderSupabase.js'

export default createJsonHandler({
  methods: ['GET'],
  authorize: requireWorkerToken,
  async run() {
    const supabase = renderSupabaseAdmin()
    const { data, error } = await supabase
      .from('render_jobs')
      .select('id,status,payload')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
    if (error) throw error
    return { job: data?.[0] ?? null }
  }
})
