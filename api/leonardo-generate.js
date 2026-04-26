import { z } from 'zod'
import { leonardoGenerateOne } from '../backend/services/leonardoService.js'

const InputSchema = z.object({
  prompt: z.string().min(2),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  seed: z.number().int().min(0).max(2_147_483_647).optional()
})

export default async function handler(req, res) {
  process.env.KATHA_SERVERLESS = '1'
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).send('Method not allowed')
    return
  }
  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body ?? {}
    const input = InputSchema.parse(body)
    const out = await leonardoGenerateOne({
      prompt: input.prompt,
      width: input.width,
      height: input.height,
      seed: input.seed
    })
    res.status(200).json(out)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(500).json({
      error: msg,
      providers: {
        openai: Boolean(process.env.OPENAI_API_KEY),
        gemini: Boolean(process.env.GEMINI_API_KEY),
        deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
        leonardo: Boolean(process.env.LEONARDO_API_KEY)
      }
    })
  }
}

