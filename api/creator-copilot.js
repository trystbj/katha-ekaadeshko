import { z } from 'zod'
import { createJsonHandler } from './_lib/http.js'
import { parseCopilotCommand, applyCopilotPatchesToScene } from '../backend/creator/copilotCommandEngine.js'

const BodySchema = z.object({
  command: z.string().min(2).max(500),
  sceneIndex: z.number().int().min(1).max(64),
  scenePlan: z.record(z.unknown()).optional()
})

export default createJsonHandler({
  methods: ['POST'],
  schema: BodySchema,
  rateLimit: { max: 45, windowMs: 60_000 },
  async run({ body }) {
    const patches = parseCopilotCommand(body.command, body.sceneIndex)
    let updatedScene = body.scenePlan ?? null
    if (updatedScene && patches.length) {
      updatedScene = applyCopilotPatchesToScene(updatedScene, patches)
    }
    return { patches, updatedScene }
  }
})
