import { z } from 'zod'
import { runKathaPipeline } from '../backend/orchestrator/kathaPipeline.js'

const InputSchema = z.object({
  theme: z.string().min(2),
  country: z.string().min(2).max(64),
  genre: z.string().min(2),
  length: z.string().min(2),
  projectId: z.string().optional()
})

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

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body ?? {}
    const input = InputSchema.parse(body)

    // NOTE: This endpoint intentionally does NOT require Supabase browser auth.
    // Optional DB-backed job tracking can be added later behind a feature flag.

    sseWrite(res, { type: 'job', id: null, note: 'SSE streaming (no DB job row)' })

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
        }
      }
    )

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
