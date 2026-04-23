import { z } from 'zod'
import { runKathaPipeline } from '../backend/orchestrator/kathaPipeline.js'

const InputSchema = z.object({
  theme: z.string().min(2),
  country: z.string().min(2).max(64),
  genre: z.string().min(2),
  length: z.string().min(2)
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
    const result = await runKathaPipeline(
      {
        theme: normalizeTheme(input.theme),
        country: input.country.trim(),
        genre: input.genre.trim(),
        length: normalizeLength(input.length)
      },
      req
    )
    res.status(200).json(result)
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

function normalizeTheme(t) {
  const s = String(t).toLowerCase().trim()
  if (s === 'urban_legend') return 'urban legend'
  if (s === 'mythology') return 'myth'
  return s
}

function normalizeLength(l) {
  const s = String(l).toLowerCase().trim()
  if (s.includes('short')) return 'short'
  if (s.includes('long')) return 'long'
  return 'medium'
}

