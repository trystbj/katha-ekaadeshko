import { z } from 'zod'
import { createJsonHandler } from '../_lib/http.js'
import { translateStoryProse } from '../../backend/story/storyTranslateEngine.js'

const BodySchema = z.object({
  text: z.string().min(1).max(120_000),
  targetLanguage: z.string().min(2).max(80),
  sourceLanguage: z.string().min(2).max(80).optional()
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 30, windowMs: 60_000 },
  async run({ body }) {
    const translatedText = await translateStoryProse({
      text: body.text,
      targetLanguage: body.targetLanguage,
      sourceLanguage: body.sourceLanguage || 'English'
    })
    return { translatedText }
  }
})
