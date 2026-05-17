import { z } from 'zod'
import { createJsonHandler } from '../_lib/http.js'
import { buildSocialCaptions } from '../../backend/social/captionGeneratorEngine.js'

const BodySchema = z.object({
  storyTitle: z.string().optional(),
  genre: z.string().optional(),
  theme: z.string().optional(),
  sceneTexts: z.array(z.string()).optional(),
  platform: z.string().optional(),
  language: z.string().optional()
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 60, windowMs: 60_000 },
  async run({ body }) {
    const captions = buildSocialCaptions(body)
    return { captions }
  }
})
