import { z } from 'zod'
import { createJsonHandler } from '../_lib/http.js'
import { buildRegenerationPlan } from '../../backend/creator/sceneRegenerationEngine.js'
import { executeRegenerationPlan } from '../../backend/creator/sceneRegenerationExecutor.js'

const BodySchema = z.object({
  target: z.enum([
    'visuals',
    'narration',
    'subtitles',
    'soundtrack',
    'ambience',
    'transitions',
    'acting',
    'camera',
    'pacing',
    'full_scene'
  ]),
  sceneIndex: z.number().int().min(1).max(64),
  episode: z.record(z.unknown()),
  execute: z.boolean().optional(),
  studioInput: z.record(z.unknown()).optional()
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 45, windowMs: 60_000 },
  async run({ body }) {
    const plan = buildRegenerationPlan(body.target, body.sceneIndex - 1, body.episode)
    if (!body.execute) return { regenerationPlan: plan }
    const execution = await executeRegenerationPlan(plan, body.episode, body.studioInput || {})
    return { regenerationPlan: plan, execution }
  }
})
