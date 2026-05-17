import { z } from 'zod'
import { createJsonHandler } from '../_lib/http.js'
import { analyzeLiveFeedback } from '../../backend/realtime/liveFeedbackEngine.js'

const BodySchema = z.object({
  episode: z.record(z.unknown())
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 90, windowMs: 60_000 },
  async run({ body }) {
    const report = analyzeLiveFeedback(body.episode)
    return { report }
  }
})
