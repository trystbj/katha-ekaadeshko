import { z } from 'zod'
import { createJsonHandler } from './_lib/http.js'
import { analyzeCinematicQuality } from '../backend/creator/qualityAnalyzer.js'

const BodySchema = z.object({
  episode: z.record(z.unknown())
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 90, windowMs: 60_000 },
  async run({ body }) {
    const report = analyzeCinematicQuality(body.episode)
    return { report }
  }
})
