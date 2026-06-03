import { z } from 'zod'
import { runStreamVisualPipeline } from '../_lib/streamVisualRunner.js'
import { serverlessMaxScenesPerVisualBatch } from '../../backend/utils/serverlessSceneLimits.js'
import { checkRateLimit, clientIp } from '../_lib/rateLimit.js'
import { parseRequestBody } from '../_lib/parseBody.js'
import { publicErrorMessage, safeLog } from '../_lib/log.js'
import { setSecurityHeaders } from '../_lib/http.js'
import { initSseResponse, sseWrite } from '../_lib/sse.js'
import { isServerlessRuntime } from '../../backend/utils/runtime.js'
import { normalizeVisualPipelineResult } from '../../backend/cinematic/visualGenerationRecovery.js'

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
  screenplayLanguage: z.string().optional(),
  projectId: z.string().optional(),
  characterVisualLocks: z.array(z.record(z.unknown())).optional(),
  narratorId: z.string().optional(),
  characterReference: z.record(z.unknown()).optional(),
  bibleCharacters: z.array(z.record(z.unknown())).optional(),
  masterStoryContext: z.record(z.unknown()).optional(),
  storyBible: z.record(z.unknown()).optional()
})

export default async function handler(req, res) {
  process.env.KATHA_SERVERLESS = '1'
  // Dedicated visual SSE route — batched scenes; allow Leonardo polls under Vercel maxDuration.
  process.env.KATHA_SERVERLESS_LEONARDO = '1'
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

    const scriptAll = body.script
    const wanted = Array.isArray(body.sceneIndices) ? body.sceneIndices : null
    let script = scriptAll
    let batchNote = null
    if (!wanted?.length && isServerlessRuntime() && scriptAll.length > 1) {
      const batchSize = serverlessMaxScenesPerVisualBatch(scriptAll.length)
      if (batchSize < scriptAll.length) {
        script = scriptAll.slice(0, batchSize)
        const remaining = scriptAll
          .slice(batchSize)
          .map((row, i) => Number(row?.scene) > 0 ? Number(row.scene) : batchSize + i + 1)
        batchNote = { batchSize, remainingSceneIndices: remaining }
      }
    }

    const result = await runStreamVisualPipeline(
      {
        story: body.story,
        script,
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
          screenplayLanguage: body.screenplayLanguage || 'en',
          projectId: body.projectId,
          characterVisualLocks: body.characterVisualLocks,
          narratorId: body.narratorId,
          characterReference: body.characterReference,
          bibleCharacters: body.bibleCharacters,
          ...(body.masterStoryContext ? { masterStoryContext: body.masterStoryContext } : {}),
          ...(body.storyBible ? { __storyBible: body.storyBible, storyBible: body.storyBible } : {})
        }
      },
      req,
      (p) => {
        try {
          if (p?.stage === 'scene_complete' && p?.image) {
            sseWrite(res, {
              type: 'scene_image',
              scene: p.scene,
              image: p.image,
              progress: p.progress,
              total: p.total
            })
          } else {
            sseWrite(res, { type: 'progress', ...p })
          }
        } catch {
          /* closed */
        }
      }
    )

    done = true
    if (keepalive) clearInterval(keepalive)
    const normalized = normalizeVisualPipelineResult(result)
    const merged = {
      ...normalized,
      metadata: {
        ...(normalized.metadata || {}),
        ...(batchNote ? { visualBatch: batchNote } : {}),
        imageCount: normalized.images.length
      }
    }
    const hasMore = Boolean(batchNote?.remainingSceneIndices?.length)
    if (!merged.images.length && !hasMore) {
      throw new Error('Visual pipeline completed without image URLs — check Leonardo API and scene prompts.')
    }
    if (merged.metadata?.pipelineYielded) {
      sseWrite(res, {
        type: 'checkpoint',
        checkpoint: merged.metadata.pipelineCheckpoint || 'visuals_partial',
        resumable: true,
        message: 'Scene images saved — continue with remaining scenes.'
      })
    }
    sseWrite(res, { type: 'result', result: merged })
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
