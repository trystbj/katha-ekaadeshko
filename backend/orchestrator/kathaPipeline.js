import { getRegionForCountry } from '../utils/regionData.js'
import {
  buildEnhancementPrompt,
  buildScriptPrompt,
  buildStoryPrompt,
  buildValidationPrompt
} from '../utils/promptTemplates.js'
import { openaiJson } from '../services/openaiService.js'
import { deepseekJson } from '../services/deepseekService.js'
import { geminiJson } from '../services/geminiService.js'
import { mergeResults } from '../utils/mergeResults.js'
import {
  getMemoryStore,
  recordFingerprint,
  recordSignature,
  recentSignatures,
  shouldRejectAsRepetitive
} from '../utils/memoryStore.js'
import { fingerprintStory, jaccard, ngramSignature } from '../utils/similarity.js'
import { leonardoGenerateForScript } from '../services/leonardoService.js'
import { ttsGenerateForScript } from '../services/ttsService.js'

const PROVIDERS = [
  {
    id: 'openai',
    hasKey: () => Boolean(process.env.OPENAI_API_KEY),
    fn: openaiJson
  },
  {
    id: 'gemini',
    hasKey: () => Boolean(process.env.GEMINI_API_KEY),
    fn: geminiJson
  },
  {
    id: 'deepseek',
    hasKey: () => Boolean(process.env.DEEPSEEK_API_KEY),
    fn: deepseekJson
  }
]

function isSwitchableProviderError(e) {
  const msg = e instanceof Error ? e.message : String(e)
  const status = typeof e?.status === 'number' ? e.status : undefined
  return (
    status === 401 ||
    status === 403 ||
    status === 402 ||
    status === 429 ||
    msg.includes('insufficient_quota') ||
    msg.toLowerCase().includes('insufficient balance') ||
    msg.includes('quota') ||
    msg.includes('API_KEY is missing') ||
    msg.includes('invalid JSON response')
  )
}

async function aiJsonAuto({ purpose, schemaHint, prompt, order = ['openai', 'gemini', 'deepseek'] }) {
  const errors = []
  for (const id of order) {
    const p = PROVIDERS.find((x) => x.id === id)
    if (!p) continue
    if (!p.hasKey()) {
      errors.push(new Error(`${id}: missing API key`))
      continue
    }
    try {
      const json = await p.fn({ purpose, schemaHint, prompt })
      return { json, provider: id }
    } catch (e) {
      errors.push(e instanceof Error ? e : new Error(String(e)))
      if (isSwitchableProviderError(e)) continue
      throw e
    }
  }
  const joined = errors.map((er) => (er?.message ? er.message : String(er))).join('\n---\n')
  throw new Error(`All providers failed for ${purpose}.\n${joined}`)
}

/**
 * Pipeline:
 * 1) OpenAI generates story JSON
 * 2) Parallel: DeepSeek validates (logic only) + Gemini enhances (cultural/dialogue)
 * 3) Merge
 * 4) OpenAI generates script JSON array
 * 5) Parallel: Leonardo images + TTS audio
 */
export async function runKathaPipeline(input, req) {
  const region = getRegionForCountry(input.country)
  const memory = await getMemoryStore()

  const providersUsed = {}

  // Stage 1 — Story generation (auto: OpenAI → Gemini → DeepSeek)
  const storyPrompt = buildStoryPrompt({ ...input, region, memory })
  const { json: story, provider: storyProvider } = await aiJsonAuto({
    purpose: 'story',
    schemaHint: 'Story',
    prompt: storyPrompt,
    order: ['openai', 'gemini', 'deepseek']
  })
  providersUsed.story = storyProvider

  // Anti-repetition: fingerprint and reject if too similar
  const fp = fingerprintStory(story)
  const sig = ngramSignature(story)
  const prevSigs = await recentSignatures()
  const tooSimilar = prevSigs.some((p) => jaccard(sig, p.sig) >= 0.42)
  const repetitive = await shouldRejectAsRepetitive(fp)
  if (repetitive || tooSimilar) {
    // Force a stronger variation attempt once
    const { json: story2, provider: story2Provider } = await aiJsonAuto({
      purpose: 'story',
      schemaHint: 'Story',
      prompt: buildStoryPrompt({
        ...input,
        region,
        memory,
        forceVariation: true
      }),
      order: ['openai', 'gemini', 'deepseek']
    })
    providersUsed.story = story2Provider
    const fp2 = fingerprintStory(story2)
    const sig2 = ngramSignature(story2)
    const tooSimilar2 = prevSigs.some((p) => jaccard(sig2, p.sig) >= 0.42)
    if ((await shouldRejectAsRepetitive(fp2)) || tooSimilar2) {
      throw new Error('Repetition guard: generated story is too similar to recent outputs. Try changing inputs.')
    }
    await recordFingerprint(fp2, { country: input.country, theme: input.theme, genre: input.genre })
    await recordSignature(sig2, { country: input.country, theme: input.theme, genre: input.genre })
    return await continuePipelineFromStory(input, region, story2, req, providersUsed)
  }

  await recordFingerprint(fp, { country: input.country, theme: input.theme, genre: input.genre })
  await recordSignature(sig, { country: input.country, theme: input.theme, genre: input.genre })
  return await continuePipelineFromStory(input, region, story, req, providersUsed)
}

async function continuePipelineFromStory(input, region, story, req, providersUsed) {
  // Stage 2 — Parallel processing
  const validationPrompt = buildValidationPrompt({ story, input, region })
  const enhancementPrompt = buildEnhancementPrompt({ story, input, region })

  const [{ json: validated, provider: validateProvider }, { json: enhanced, provider: enhanceProvider }] =
    await Promise.all([
      aiJsonAuto({
        purpose: 'validate',
        schemaHint: 'ValidatedStory',
        prompt: validationPrompt,
        // DeepSeek is best at consistency checks, but fall back if missing/quota.
        order: ['deepseek', 'openai', 'gemini']
      }),
      aiJsonAuto({
        purpose: 'enhance',
        schemaHint: 'EnhancedStory',
        prompt: enhancementPrompt,
        // Gemini is best at cultural/dialogue enhancements, but fall back if missing/quota.
        order: ['gemini', 'openai', 'deepseek']
      })
    ])
  providersUsed.validate = validateProvider
  providersUsed.enhance = enhanceProvider

  // Stage 3 — Merge results
  const finalStory = mergeResults(story, validated, enhanced)

  // Stage 4 — Script generation (auto: OpenAI → Gemini → DeepSeek)
  const { json: script, provider: scriptProvider } = await aiJsonAuto({
    purpose: 'script',
    schemaHint: 'Script',
    prompt: buildScriptPrompt({ story: finalStory, input, region }),
    order: ['openai', 'gemini', 'deepseek']
  })
  providersUsed.script = scriptProvider

  // Stage 5 — Parallel content generation
  const [images, audio] = await Promise.all([
    leonardoGenerateForScript({ script, input, region }),
    ttsGenerateForScript({ script, input, region, req })
  ])

  return {
    story: finalStory,
    script,
    images,
    audio,
    metadata: {
      country: input.country,
      region,
      genre: input.genre,
      theme: input.theme,
      length: input.length,
      aiProviders: providersUsed
    }
  }
}

