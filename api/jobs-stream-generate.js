import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { runKathaPipeline } from '../backend/orchestrator/kathaPipeline.js'

const InputSchema = z.object({
  theme: z.string().min(2),
  country: z.string().min(2).max(64),
  genre: z.string().min(2),
  length: z.string().min(2),
  projectId: z.string().optional()
})

function supabaseFromReq(req) {
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase env missing (SUPABASE_URL / SUPABASE_ANON_KEY).')
  const auth = req.headers?.authorization || ''
  return createClient(url, anon, {
    global: { headers: auth ? { Authorization: auth } : {} },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  })
}

function sseWrite(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`)
}

export default async function handler(req, res) {
  process.env.KATHA_SERVERLESS = '1'
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).send('Method not allowed')
    return
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const supabase = supabaseFromReq(req)
  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body ?? {}
    const input = InputSchema.parse(body)

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr) throw userErr
    const ownerId = userData?.user?.id
    if (!ownerId) throw new Error('Not authenticated')

    const { data: jobRow, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        owner_id: ownerId,
        project_id: input.projectId ?? null,
        type: 'generate_story',
        status: 'running',
        progress: 0,
        stage: 'starting',
        log: []
      })
      .select('id')
      .single()
    if (jobErr) throw jobErr
    const jobId = jobRow.id

    sseWrite(res, { type: 'job', id: jobId })

    const log = []
    const pushLog = async (entry) => {
      log.push(entry)
      await supabase
        .from('jobs')
        .update({
          stage: entry.stage,
          progress: entry.progress,
          log
        })
        .eq('id', jobId)
    }

    const result = await runKathaPipeline(
      {
        theme: String(input.theme).trim(),
        country: String(input.country).trim(),
        genre: String(input.genre).trim(),
        length: String(input.length).trim()
      },
      req,
      {
        onProgress: async (p) => {
          const entry = {
            at: new Date().toISOString(),
            stage: String(p.stage || ''),
            progress: Number.isFinite(p.progress) ? Number(p.progress) : 0,
            message: p.message ? String(p.message) : ''
          }
          sseWrite(res, { type: 'progress', ...entry })
          await pushLog(entry)
        }
      }
    )

    await supabase
      .from('jobs')
      .update({ status: 'done', progress: 100, stage: 'done', result_ref: { ok: true } })
      .eq('id', jobId)

    sseWrite(res, { type: 'result', result })
    res.end()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    try {
      sseWrite(res, { type: 'error', error: msg })
    } catch {
      // ignore
    }
    res.end()
  }
}

