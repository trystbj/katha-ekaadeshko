import { z } from 'zod'
import { createJsonHandler } from '../_lib/http.js'
import { supabaseFromReq } from '../_lib/projectsSupabase.js'

const BodySchema = z.object({
  project: z.any()
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 60, windowMs: 60_000 },
  async run({ body, req }) {
    const project = body.project
    const id = project?.id
    if (!id) throw new Error('Project id missing')

    const supabase = supabaseFromReq(req)
    const title = String(project?.title || 'Untitled Story')
    const status = String(project?.status || 'new')
    const updatedAt = project?.updatedAt ? String(project.updatedAt) : new Date().toISOString()

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr) throw userErr
    const ownerId = userData?.user?.id
    if (!ownerId) throw new Error('Not authenticated')

    const { error } = await supabase.from('projects').upsert(
      {
        id,
        owner_id: ownerId,
        title,
        status,
        updated_at: updatedAt,
        project_json: { ...project, updatedAt }
      },
      { onConflict: 'id' }
    )
    if (error) throw error
    return { ok: true, id }
  }
})
