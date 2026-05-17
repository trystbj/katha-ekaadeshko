import { z } from 'zod'
import { createJsonHandler } from '../_lib/http.js'
import { analyzeShortsOptimization } from '../../backend/social/shortsOptimizerEngine.js'

const BodySchema = z.object({
  episode: z.record(z.unknown()).optional(),
  totalDurationSec: z.number().optional()
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 60, windowMs: 60_000 },
  async run({ body }) {
    const report = analyzeShortsOptimization(body)
    return { report }
  }
})
