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

  // Stage 1 — Story generation (OpenAI)
  const storyPrompt = buildStoryPrompt({ ...input, region, memory })
  const story = await openaiJson({
    purpose: 'story',
    schemaHint: 'Story',
    prompt: storyPrompt
  })

  // Anti-repetition: fingerprint and reject if too similar
  const fp = fingerprintStory(story)
  const sig = ngramSignature(story)
  const prevSigs = await recentSignatures()
  const tooSimilar = prevSigs.some((p) => jaccard(sig, p.sig) >= 0.42)
  const repetitive = await shouldRejectAsRepetitive(fp)
  if (repetitive || tooSimilar) {
    // Force a stronger variation attempt once
    const story2 = await openaiJson({
      purpose: 'story',
      schemaHint: 'Story',
      prompt: buildStoryPrompt({
        ...input,
        region,
        memory,
        forceVariation: true
      })
    })
    const fp2 = fingerprintStory(story2)
    const sig2 = ngramSignature(story2)
    const tooSimilar2 = prevSigs.some((p) => jaccard(sig2, p.sig) >= 0.42)
    if ((await shouldRejectAsRepetitive(fp2)) || tooSimilar2) {
      throw new Error('Repetition guard: generated story is too similar to recent outputs. Try changing inputs.')
    }
    await recordFingerprint(fp2, { country: input.country, theme: input.theme, genre: input.genre })
    await recordSignature(sig2, { country: input.country, theme: input.theme, genre: input.genre })
    return await continuePipelineFromStory(input, region, story2)
  }

  await recordFingerprint(fp, { country: input.country, theme: input.theme, genre: input.genre })
  await recordSignature(sig, { country: input.country, theme: input.theme, genre: input.genre })
  return await continuePipelineFromStory(input, region, story, req)
}

async function continuePipelineFromStory(input, region, story, req) {
  // Stage 2 — Parallel processing
  const [validated, enhanced] = await Promise.all([
    deepseekJson({
      purpose: 'validate',
      schemaHint: 'ValidatedStory',
      prompt: buildValidationPrompt({ story, input, region })
    }),
    geminiJson({
      purpose: 'enhance',
      schemaHint: 'EnhancedStory',
      prompt: buildEnhancementPrompt({ story, input, region })
    })
  ])

  // Stage 3 — Merge results
  const finalStory = mergeResults(story, validated, enhanced)

  // Stage 4 — Script generation
  const script = await openaiJson({
    purpose: 'script',
    schemaHint: 'Script',
    prompt: buildScriptPrompt({ story: finalStory, input, region })
  })

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
      length: input.length
    }
  }
}

