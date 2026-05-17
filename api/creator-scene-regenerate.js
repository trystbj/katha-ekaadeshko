import { z } from 'zod'
import { createJsonHandler } from './_lib/http.js'
import { buildRegenerationPlan } from '../backend/creator/sceneRegenerationEngine.js'

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
  episode: z.record(z.unknown())
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 45, windowMs: 60_000 },
  async run({ body }) {
    const plan = buildRegenerationPlan(body.target, body.sceneIndex - 1, body.episode)
    return { regenerationPlan: plan }
  }
})
