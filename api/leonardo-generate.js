import { z } from 'zod'
import { createJsonHandler, withTimeout } from './_lib/http.js'
import { leonardoGenerateOne } from '../backend/services/leonardoService.js'

const InputSchema = z.object({
  prompt: z.string().min(2).max(4000),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  seed: z.number().int().min(0).max(2_147_483_647).optional()
})

export default createJsonHandler({
  methods: ['POST'],
  schema: InputSchema,
  rateLimit: { max: 30, windowMs: 60_000 },
  async run({ body }) {
    process.env.KATHA_SERVERLESS = '1'
    return withTimeout(
      leonardoGenerateOne({
        prompt: body.prompt,
        width: body.width,
        height: body.height,
        seed: body.seed
      }),
      110_000,
      'leonardo-generate'
    )
  }
})
