import { z } from 'zod'
import { runKathaPipeline } from '../../backend/orchestrator/kathaPipeline.js'
import { normalizeNarratorId } from '../../backend/utils/narratorPresets.js'
import { checkRateLimit, clientIp } from '../_lib/rateLimit.js'
import { parseRequestBody } from '../_lib/parseBody.js'
import { publicErrorMessage, safeLog } from '../_lib/log.js'
import { setSecurityHeaders } from '../_lib/http.js'

const NarratorIdSchema = z.preprocess(
  (val) => normalizeNarratorId(typeof val === 'string' ? val : ''),
  z.enum(['tryst_bj', 'penguin'])
)

const VisualStyleIdSchema = z.enum([
  'soft_anime_fantasy',
  'cinematic_anime',
  'comic_panel',
  'dark_anime',
  'cozy_storybook',
  'custom'
])

const InputSchema = z
  .object({
  theme: z.string().min(2),
  country: z.string().min(2).max(64),
  genre: z.string().min(2),
  length: z.string().min(2),
  projectId: z.string().optional(),
  /** Rolling episodic memory from studio project — improves continuity across generations. */
  priorMemorySummary: z.string().max(4000).optional(),
  /** Hint for adaptive cinematic performance tier (e.g. prefers-reduced-motion). */
  performancePreferLow: z.boolean().optional(),
  /** Persistent world simulation from prior episodes. */
  priorWorldState: z.record(z.unknown()).optional(),
  /** Relationship graph edges from prior episodes. */
  priorRelationships: z.array(z.record(z.unknown())).max(32).optional(),
  /** Learned creator preferences blob. */
  creatorPreferences: z.record(z.unknown()).optional(),
  /** Optional director personality override (auto = style/genre inferred). */
  directorPersonalityPreference: z
    .enum([
      'auto',
      'hollywood_cinematic',
      'anime_director',
      'cozy_storybook',
      'dark_psychological',
      'experimental_art',
      'emotional_drama',
      'mystery_thriller',
      'fantasy_epic'
    ])
    .optional(),
  aspectMode: z.enum(['vertical_9_16', 'horizontal_16_9']),
  narratorId: NarratorIdSchema,
  /** BCP-style story text language (studio `storyLanguage`) — locks narration + dialogue. */
  storyLanguage: z.string().min(2).max(24).optional().default('en'),
  /** Optional audience band for blueprint lock (no studio UI yet — reserved). */
  audienceAgeCategory: z.string().max(48).optional(),
  /** Matches studio tone picker (warm, tense, epic, …); drives ambient bed selection. */
  storyTone: z.string().max(32).optional(),
  /** Short idea line — keyword hints for bed (e.g. horror cues). */
  seedLine: z.string().max(600).optional(),
  /** Studio visual style card — drives Leonardo + script visual lock. */
  styleId: VisualStyleIdSchema.optional(),
  /** Required when styleId is custom (must match studio validation). */
  customVisualPrompt: z.string().max(1200).optional(),
  /** Nepal pack / mood line — layered as accent without swapping rendering medium. */
  visualAccent: z.string().max(600).optional(),
  /** Optional story-audio overrides (no UI yet — API / integrations only). */
  audioMix: z
    .object({
      musicEnabled: z.boolean().optional(),
      sfxEnabled: z.boolean().optional(),
      musicGain: z.number().min(0).max(1).optional(),
      sfxGain: z.number().min(0).max(1).optional(),
      autoMix: z.boolean().optional(),
      maxSfxCues: z.number().int().min(0).max(16).optional()
    })
    .optional(),
  /** Studio narration settings — language, auto voice director, optional gender preference. */
  narration: z
    .object({
      languageId: z.string().max(16).optional(),
      voiceMode: z.literal('auto').optional(),
      autoVoiceDirector: z.boolean().optional(),
      narratorGenderPreference: z
        .enum(['auto', 'male', 'female', 'child', 'elder', 'mythical', 'dark_entity', 'anime_hero', 'anime_villain'])
        .optional(),
      ai: z.record(z.unknown()).optional()
    })
    .passthrough()
    .optional(),
  /** When false, pipeline uses legacy narrator preset only (fallback). */
  autoVoiceDirector: z.boolean().optional(),
  narratorGenderPreference: z
    .enum(['auto', 'male', 'female', 'child', 'elder', 'mythical', 'dark_entity', 'anime_hero', 'anime_villain'])
    .optional()
})
  .superRefine((data, ctx) => {
    if (data.styleId === 'custom') {
      const v = String(data.customVisualPrompt || '').trim()
      if (v.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'customVisualPrompt is required when styleId is custom',
          path: ['customVisualPrompt']
        })
      }
    }
  })

function sseWrite(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`)
}

export default async function handler(req, res) {
  process.env.KATHA_SERVERLESS = '1'
  setSecurityHeaders(res)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).send('Method not allowed')
    return
  }

  const rl = checkRateLimit(`generate:${clientIp(req)}`, { max: 8, windowMs: 60_000 })
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfterSec))
    res.status(429).json({ error: 'Too many generation requests' })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  try {
    const input = InputSchema.parse(parseRequestBody(req))

    sseWrite(res, { type: 'job', id: null, note: 'SSE streaming (no DB job row)' })

    const result = await runKathaPipeline(
      {
        theme: String(input.theme).trim(),
        country: String(input.country).trim(),
        genre: String(input.genre).trim(),
        length: String(input.length).trim(),
        aspectMode: input.aspectMode === 'horizontal_16_9' ? 'horizontal_16_9' : 'vertical_9_16',
        narratorId: input.narratorId,
        storyLanguage: String(input.storyLanguage).trim(),
        audienceAgeCategory: input.audienceAgeCategory
          ? String(input.audienceAgeCategory).trim()
          : undefined,
        storyTone: input.storyTone ? String(input.storyTone).trim() : undefined,
        seedLine: input.seedLine ? String(input.seedLine).trim() : undefined,
        styleId: input.styleId || 'soft_anime_fantasy',
        customVisualPrompt:
          input.styleId === 'custom' && input.customVisualPrompt
            ? String(input.customVisualPrompt).trim()
            : undefined,
        visualAccent: input.visualAccent ? String(input.visualAccent).trim() : undefined,
        audioMix: input.audioMix,
        narration: input.narration,
        autoVoiceDirector: input.autoVoiceDirector ?? input.narration?.autoVoiceDirector ?? true,
        narratorGenderPreference:
          input.narratorGenderPreference ?? input.narration?.narratorGenderPreference ?? 'auto',
        narrationLanguageId: input.narration?.languageId
          ? String(input.narration.languageId).trim()
          : undefined
      },
      req,
      {
        onProgress: async (p) => {
          const entry = {
            at: new Date().toISOString(),
            stage: String(p.stage || ''),
            progress: Number.isFinite(p.progress) ? Number(p.progress) : 0,
            message: p.message ? String(p.message) : ''
          }
          sseWrite(res, { type: 'progress', ...entry })
        }
      }
    )

    sseWrite(res, { type: 'result', result })
    res.end()
  } catch (e) {
    safeLog('error', 'jobs-stream-generate failed', { message: e instanceof Error ? e.message : String(e) })
    const msg = publicErrorMessage(e)
    try {
      sseWrite(res, { type: 'error', error: msg })
    } catch {
      // ignore
    }
    res.end()
  }
}
