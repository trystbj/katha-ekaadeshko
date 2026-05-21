import { z } from 'zod'
import { runKathaVisualPipeline } from '../../backend/orchestrator/kathaVisualPipeline.js'
import { checkRateLimit, clientIp } from '../_lib/rateLimit.js'
import { parseRequestBody } from '../_lib/parseBody.js'
import { publicErrorMessage, safeLog } from '../_lib/log.js'
import { setSecurityHeaders } from '../_lib/http.js'
import { initSseResponse, sseWrite } from '../_lib/sse.js'
import { isServerlessRuntime, serverlessPipelineBudgetMs } from '../../backend/utils/runtime.js'

const BodySchema = z.object({
  story: z.record(z.unknown()),
  script: z.array(z.record(z.unknown())).min(1),
  sceneIndices: z.array(z.number().int().min(1).max(64)).optional(),
  aspectMode: z.enum(['vertical_9_16', 'horizontal_16_9']).optional(),
  styleId: z.string().optional(),
  customVisualPrompt: z.string().max(1200).optional(),
  visualAccent: z.string().max(600).optional(),
  genre: z.string().optional(),
  theme: z.string().optional(),
  country: z.string().optional(),
  storyLanguage: z.string().optional(),
  narratorId: z.string().optional(),
  characterReference: z.record(z.unknown()).optional(),
  bibleCharacters: z.array(z.record(z.unknown())).optional()
})

function runVisualWithBudget(input, req, onProgress) {
  const run = runKathaVisualPipeline({ ...input, req, onProgress })
  if (!isServerlessRuntime()) return run
  const budgetMs = serverlessPipelineBudgetMs()
  return Promise.race([
    run,
    new Promise((_, reject) => {
      setTimeout(() => {
        const e = new Error(
          'Visual generation timed out on the server (~60s limit). Try fewer scenes or regenerate one scene at a time.'
        )
        e.status = 504
        reject(e)
      }, budgetMs)
    })
  ])
}

export default async function handler(req, res) {
  process.env.KATHA_SERVERLESS = '1'
  setSecurityHeaders(res)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).send('Method not allowed')
    return
  }

  const rl = checkRateLimit(`visuals:${clientIp(req)}`, { max: 12, windowMs: 60_000 })
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfterSec))
    res.status(429).json({ error: 'Too many visual generation requests' })
    return
  }

  initSseResponse(res)
  let keepalive = null
  let done = false

  try {
    const body = BodySchema.parse(parseRequestBody(req))
    sseWrite(res, { type: 'job', id: null, note: 'Visual generation stream' })

    keepalive = isServerlessRuntime()
      ? setInterval(() => {
          if (done) return
          try {
            sseWrite(res, { type: 'progress', stage: 'alive', progress: -1, message: 'Generating visuals…' })
          } catch {
            /* closed */
          }
        }, 10_000)
      : null

    const result = await runVisualWithBudget(
      {
        story: body.story,
        script: body.script,
        sceneIndices: body.sceneIndices,
        input: {
          aspectMode: body.aspectMode || 'vertical_9_16',
          styleId: body.styleId,
          customVisualPrompt: body.customVisualPrompt,
          visualAccent: body.visualAccent,
          genre: body.genre,
          theme: body.theme,
          country: body.country,
          storyLanguage: body.storyLanguage,
          narratorId: body.narratorId,
          characterReference: body.characterReference,
          bibleCharacters: body.bibleCharacters
        }
      },
      req,
      (p) => {
        try {
          sseWrite(res, { type: 'progress', ...p })
        } catch {
          /* closed */
        }
      }
    )

    done = true
    if (keepalive) clearInterval(keepalive)
    sseWrite(res, { type: 'result', result })
    res.end()
  } catch (e) {
    done = true
    if (keepalive) clearInterval(keepalive)
    safeLog('error', 'jobs-generate-visuals failed', { message: e instanceof Error ? e.message : String(e) })
    try {
      sseWrite(res, { type: 'error', error: publicErrorMessage(e) })
      res.end()
    } catch {
      /* closed */
    }
  }
}
