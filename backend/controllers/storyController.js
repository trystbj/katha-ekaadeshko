import { z } from 'zod'
import { runKathaPipeline } from '../orchestrator/kathaPipeline.js'

const InputSchema = z.object({
  theme: z.enum(['myth', 'mythology', 'folklore', 'urban legend', 'urban_legend', 'paranormal']).or(z.string().min(2)),
  country: z.string().min(2).max(64),
  genre: z.enum(['horror', 'mystery', 'love', 'supernatural', 'thriller', 'adventure', 'drama']).or(z.string().min(2)),
  length: z.enum(['short', 'medium', 'long']).or(z.string().min(2))
})

export async function generateKatha(req, res, next) {
  try {
    const input = InputSchema.parse(req.body ?? {})
    const result = await runKathaPipeline(
      {
      theme: normalizeTheme(input.theme),
      country: input.country.trim(),
      genre: input.genre.trim(),
      length: normalizeLength(input.length)
      },
      req
    )
    res.json(result)
  } catch (err) {
    next(err)
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

