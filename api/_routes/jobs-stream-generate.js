import { z } from 'zod'
import { runKathaPipeline } from '../../backend/orchestrator/kathaPipeline.js'
import { normalizeNarratorId } from '../../backend/utils/narratorPresets.js'
import { checkRateLimit, clientIp } from '../_lib/rateLimit.js'
import { parseRequestBody } from '../_lib/parseBody.js'
import { publicErrorMessage, safeLog } from '../_lib/log.js'
import { setSecurityHeaders } from '../_lib/http.js'
import { initSseResponse, sseWrite } from '../_lib/sse.js'
import { slimStreamGenerateResult } from '../_lib/streamGenerateResult.js'
import { isServerlessRuntime, serverlessPipelineBudgetMs } from '../../backend/utils/runtime.js'
import { ensureMemoryStore } from '../../backend/utils/memoryStore.js'
import { providerAvailability } from '../../core/providers/aiProviderRegistry.js'
import { STORY_IDEA_MAX_CHARS, clampStoryIdea } from '../../shared/storyIdeaLimits.js'
import { buildInfoPayload, KATHA_API_BUILD } from '../_lib/buildInfo.js'
import { slimGenerateRequestBody } from '../_lib/slimGenerateBody.js'
import { sanitizePublicError } from '../_lib/log.js'

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
    priorMemorySummary: z.string().max(4000).optional(),
    performancePreferLow: z.boolean().optional(),
    studioOrchestration: z.boolean().optional(),
    multiCharacterVoices: z.boolean().optional(),
    priorWorldState: z.record(z.unknown()).optional(),
    priorRelationships: z.array(z.record(z.unknown())).max(32).optional(),
    creatorPreferences: z.record(z.unknown()).optional(),
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
    storyLanguage: z.string().min(2).max(24).optional().default('en'),
    audienceAgeCategory: z.string().max(48).optional(),
    storyTone: z.string().max(32).optional(),
    seedLine: z.string().max(STORY_IDEA_MAX_CHARS).optional(),
    styleId: VisualStyleIdSchema.optional(),
    customVisualPrompt: z.string().max(1200).optional(),
    visualAccent: z.string().max(600).optional(),
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
    autoVoiceDirector: z.boolean().optional(),
    narratorGenderPreference: z
      .enum(['auto', 'male', 'female', 'child', 'elder', 'mythical', 'dark_entity', 'anime_hero', 'anime_villain'])
      .optional(),
    bibleCharacters: z
      .array(
        z
          .object({
            name: z.string().max(120),
            gender: z.string().max(32).optional(),
            age: z.string().max(32).optional(),
            appearance: z.string().max(400).optional(),
            visualIdentity: z.string().max(400).optional(),
            referenceImages: z
              .array(
                z.object({
                  id: z.string(),
                  role: z.enum(['front', 'side', 'expression', 'other']).optional(),
                  dataUrl: z.string().max(1_200_000),
                  filename: z.string().optional()
                })
              )
              .max(3)
              .optional()
          })
          .passthrough()
      )
      .max(12)
      .optional(),
    /** Step 1: story + script only — no Leonardo/TTS until user approves visuals */
    scriptOnly: z.boolean().optional(),
    /** fast | cinematic — controls motion intensity and Leonardo video resolution */
    generationMode: z.enum(['fast', 'cinematic']).optional(),
    characterReference: z
      .object({
        lockAllEpisodes: z.boolean().optional(),
        strength: z.enum(['light', 'balanced', 'strong']).optional(),
        autoTurnaroundPreview: z.boolean().optional(),
        images: z
          .array(
            z.object({
              id: z.string(),
              role: z.enum(['front', 'side', 'expression', 'other']).optional(),
              dataUrl: z.string().max(1_200_000),
              filename: z.string().optional(),
              addedAt: z.string().optional()
            })
          )
          .max(3)
          .optional()
      })
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

function runPipelineWithBudget(input, req, opts) {
  const run = runKathaPipeline(input, req, opts)
  if (!isServerlessRuntime()) return run
  const budgetMs = serverlessPipelineBudgetMs()
  return Promise.race([
    run,
    new Promise((_, reject) => {
      setTimeout(() => {
        const e = new Error(
          'Generation timed out on the server (~60s limit). Try again or use a shorter story length.'
        )
        e.status = 504
        reject(e)
      }, budgetMs)
    })
  ])
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

  initSseResponse(res)

  let keepalive = null
  let pipelineDone = false

  const writeError = (msg, extra = {}) => {
    try {
      sseWrite(res, {
        type: 'error',
        error: msg,
        build: KATHA_API_BUILD,
        ...extra
      })
    } catch {
      // ignore
    }
    try {
      res.end()
    } catch {
      // ignore
    }
  }

  try {
    await ensureMemoryStore()
    const providers = providerAvailability()
    if (!providers.openai && !providers.gemini && !providers.deepseek) {
      writeError(
        'Story AI is not configured on the server. Add OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY in Vercel → Environment Variables, then redeploy.'
      )
      return
    }

    const input = InputSchema.parse(slimGenerateRequestBody(parseRequestBody(req)))

    sseWrite(res, {
      type: 'job',
      id: null,
      note: 'SSE streaming (no DB job row)',
      build: KATHA_API_BUILD,
      ...buildInfoPayload()
    })

    keepalive = isServerlessRuntime()
      ? setInterval(() => {
          if (pipelineDone) return
          try {
            sseWrite(res, { type: 'progress', stage: 'alive', progress: -1, message: 'Still generating…' })
          } catch {
            // stream closed
          }
        }, 10_000)
      : null

    const result = await runPipelineWithBudget(
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
        seedLine: input.seedLine ? clampStoryIdea(String(input.seedLine).trim()) : undefined,
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
          : undefined,
        performancePreferLow:
          input.scriptOnly === true ? true : (input.performancePreferLow ?? isServerlessRuntime()),
        scriptOnly: input.scriptOnly === true,
        generationMode: input.generationMode,
        projectId: input.projectId,
        priorMemorySummary: input.priorMemorySummary,
        priorWorldState: input.priorWorldState,
        priorRelationships: input.priorRelationships,
        creatorPreferences: input.creatorPreferences,
        directorPersonalityPreference: input.directorPersonalityPreference,
        studioOrchestration: input.scriptOnly === true ? false : input.studioOrchestration,
        multiCharacterVoices: input.scriptOnly === true ? false : input.multiCharacterVoices,
        bibleCharacters: input.bibleCharacters,
        characterReference: input.characterReference
      },
      req,
      {
        onProgress: (p) => {
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

    pipelineDone = true
    if (keepalive) clearInterval(keepalive)

    const payload = slimStreamGenerateResult(result)
    sseWrite(res, { type: 'result', result: payload })
    res.end()
  } catch (e) {
    pipelineDone = true
    if (keepalive) clearInterval(keepalive)
    const raw = e instanceof Error ? e.message : String(e)
    safeLog('error', 'jobs-stream-generate failed', {
      message: raw,
      name: e instanceof Error ? e.name : 'Error',
      status: typeof e?.status === 'number' ? e.status : undefined,
      build: KATHA_API_BUILD
    })
    writeError(publicErrorMessage(e), {
      detail: sanitizePublicError(raw),
      code: e?.name === 'ZodError' ? 'validation' : 'pipeline'
    })
  }
}
