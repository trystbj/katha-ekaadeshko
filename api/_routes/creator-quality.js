import { z } from 'zod'
import { createJsonHandler } from '../_lib/http.js'
import { analyzeCinematicQuality } from '../../backend/creator/qualityAnalyzer.js'
import { analyzeStoryQualityStudio } from '../../backend/cinematic/premium/storyQualityStudio.js'

const BodySchema = z.object({
  episode: z.record(z.unknown())
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 90, windowMs: 60_000 },
  async run({ body }) {
    const report = analyzeStoryQualityStudio(body.episode)
    return { report: report?.version ? report : analyzeCinematicQuality(body.episode) }
  }
})
