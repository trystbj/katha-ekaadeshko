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
import { resolveAmbientBedUrl } from '../utils/storyAudioCatalog.js'
import { buildStoryAudioPlan } from '../utils/buildStoryAudioPlan.js'
import { buildSceneOrchestratedPlan } from '../cinematic/pipeline/sceneOrchestrationPipeline.js'
import { detectStyleHybridRequested, resolveStyleProfile } from '../utils/visualStyleLock.js'
import {
  buildBlueprintCompliancePrompt,
  buildGenerationBlueprint,
  normalizePipelineInput
} from '../utils/generationBlueprint.js'
import { isServerlessRuntime, serverlessFastPipeline } from '../utils/runtime.js'

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
 * Optional second pass when KATHA_BLUEPRINT_COMPLIANCE_RETRY=1 — QC story vs blueprint, regenerate once if needed.
 */
async function maybeBlueprintRepairStory({ pinnedInput, region, memory, finalStory, providersUsed, onProgress }) {
  if (process.env.KATHA_BLUEPRINT_COMPLIANCE_RETRY !== '1') return finalStory
  try {
    const { json, provider } = await aiJsonAuto({
      purpose: 'blueprint_compliance',
      schemaHint: 'BlueprintCompliance',
      prompt: buildBlueprintCompliancePrompt(pinnedInput, finalStory),
      order: ['deepseek', 'openai', 'gemini']
    })
    providersUsed.blueprintCompliance = provider
    if (!json || json.compliant !== false) return finalStory
    const violations = String(json.violations || '').trim()
    if (!violations) return finalStory

    if (onProgress) {
      onProgress({
        stage: 'blueprint_repair',
        progress: 38,
        message: 'Re-aligning story with locked preferences'
      })
    }
    const repairPrompt = buildStoryPrompt({
      ...pinnedInput,
      region,
      memory,
      blueprintRepairNotes: violations
    })
    const { json: story2, provider: storyRepairProvider } = await aiJsonAuto({
      purpose: 'story',
      schemaHint: 'Story',
      prompt: repairPrompt,
      order: ['openai', 'gemini', 'deepseek']
    })
    providersUsed.storyRepair = storyRepairProvider

    const [{ json: validated2 }, { json: enhanced2 }] = await Promise.all([
      aiJsonAuto({
        purpose: 'validate',
        schemaHint: 'ValidatedStory',
        prompt: buildValidationPrompt({ story: story2, input: pinnedInput, region }),
        order: ['deepseek', 'openai', 'gemini']
      }),
      aiJsonAuto({
        purpose: 'enhance',
        schemaHint: 'EnhancedStory',
        prompt: buildEnhancementPrompt({ story: story2, input: pinnedInput, region }),
        order: ['gemini', 'openai', 'deepseek']
      })
    ])
    return mergeResults(story2, validated2, enhanced2)
  } catch {
    return finalStory
  }
}

/**
 * Pipeline:
 * 1) OpenAI generates story JSON
 * 2) Parallel: DeepSeek validates (logic only) + Gemini enhances (cultural/dialogue)
 * 3) Merge
 * 4) OpenAI generates script JSON array
 * 5) Parallel: Leonardo images + TTS audio
 */
export async function runKathaPipeline(input, req, opts = {}) {
  const onProgress = typeof opts?.onProgress === 'function' ? opts.onProgress : null
  const normalized = normalizePipelineInput(input)
  const region = getRegionForCountry(normalized.country)
  const blueprintPack = buildGenerationBlueprint(normalized)
  const pinnedInput = {
    ...normalized,
    __generationBlueprint: blueprintPack.blueprintBlock,
    __storyLanguageDisplay: blueprintPack.languageDisplayName,
    __generationBlueprintMeta: blueprintPack.compactMeta
  }
  const memory = await getMemoryStore()

  const providersUsed = {}

  // Stage 1 — Story generation (auto: OpenAI → Gemini → DeepSeek)
  if (onProgress) onProgress({ stage: 'story', progress: 5, message: 'Drafting story' })
  const storyPrompt = buildStoryPrompt({ ...pinnedInput, region, memory })
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
  if ((repetitive || tooSimilar) && !isServerlessRuntime()) {
    // Force a stronger variation attempt once (skipped on serverless — saves one full LLM round-trip).
    const { json: story2, provider: story2Provider } = await aiJsonAuto({
      purpose: 'story',
      schemaHint: 'Story',
      prompt: buildStoryPrompt({
        ...pinnedInput,
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
    await recordFingerprint(fp2, {
      country: pinnedInput.country,
      theme: pinnedInput.theme,
      genre: pinnedInput.genre
    })
    await recordSignature(sig2, {
      country: pinnedInput.country,
      theme: pinnedInput.theme,
      genre: pinnedInput.genre
    })
    return await continuePipelineFromStory(
      pinnedInput,
      region,
      story2,
      req,
      providersUsed,
      onProgress,
      memory
    )
  }

  await recordFingerprint(fp, {
    country: pinnedInput.country,
    theme: pinnedInput.theme,
    genre: pinnedInput.genre
  })
  await recordSignature(sig, {
    country: pinnedInput.country,
    theme: pinnedInput.theme,
    genre: pinnedInput.genre
  })
  return await continuePipelineFromStory(pinnedInput, region, story, req, providersUsed, onProgress, memory)
}

async function continuePipelineFromStory(pinnedInput, region, story, req, providersUsed, onProgress, memory) {
  const fast = serverlessFastPipeline()
  let finalStory = story

  if (fast) {
    if (onProgress) {
      onProgress({
        stage: 'merge',
        progress: 28,
        message: 'Preparing story (serverless fast path)'
      })
    }
    providersUsed.validate = 'skipped_serverless'
    providersUsed.enhance = 'skipped_serverless'
  } else {
    // Stage 2 — Parallel processing
    if (onProgress) onProgress({ stage: 'validate', progress: 20, message: 'Validating + enhancing' })
    const validationPrompt = buildValidationPrompt({ story, input: pinnedInput, region })
    const enhancementPrompt = buildEnhancementPrompt({ story, input: pinnedInput, region })

    const [{ json: validated, provider: validateProvider }, { json: enhanced, provider: enhanceProvider }] =
      await Promise.all([
        aiJsonAuto({
          purpose: 'validate',
          schemaHint: 'ValidatedStory',
          prompt: validationPrompt,
          order: ['deepseek', 'openai', 'gemini']
        }),
        aiJsonAuto({
          purpose: 'enhance',
          schemaHint: 'EnhancedStory',
          prompt: enhancementPrompt,
          order: ['gemini', 'openai', 'deepseek']
        })
      ])
    providersUsed.validate = validateProvider
    providersUsed.enhance = enhanceProvider

    if (onProgress) onProgress({ stage: 'merge', progress: 35, message: 'Merging results' })
    finalStory = mergeResults(story, validated, enhanced)

    finalStory = await maybeBlueprintRepairStory({
      pinnedInput,
      region,
      memory,
      finalStory,
      providersUsed,
      onProgress
    })
  }

  // Stage 4 — Script generation (auto: OpenAI → Gemini → DeepSeek)
  if (onProgress) onProgress({ stage: 'script', progress: 50, message: 'Writing script' })
  const { json: script, provider: scriptProvider } = await aiJsonAuto({
    purpose: 'script',
    schemaHint: 'Script',
    prompt: buildScriptPrompt({ story: finalStory, input: pinnedInput, region }),
    order: ['openai', 'gemini', 'deepseek']
  })
  providersUsed.script = scriptProvider

  // Stage 5 — Parallel content generation
  if (onProgress) onProgress({ stage: 'images', progress: 65, message: 'Generating images + audio' })
  const [images, audio] = await Promise.all([
    leonardoGenerateForScript({ script, input: pinnedInput, region, onProgress }),
    ttsGenerateForScript({ script, input: pinnedInput, region, req })
  ])

  if (onProgress) onProgress({ stage: 'done', progress: 100, message: 'Done' })
  const ambientBedUrl = resolveAmbientBedUrl({
    genre: pinnedInput.genre,
    theme: pinnedInput.theme,
    tone: pinnedInput.storyTone,
    seedLine: pinnedInput.seedLine,
    setting: typeof finalStory?.setting === 'string' ? finalStory.setting : '',
    country: pinnedInput.country
  })
  let storyAudioPlan = buildStoryAudioPlan({
    genre: pinnedInput.genre,
    theme: pinnedInput.theme,
    storyTone: pinnedInput.storyTone,
    seedLine: pinnedInput.seedLine,
    setting: typeof finalStory?.setting === 'string' ? finalStory.setting : '',
    country: pinnedInput.country,
    script,
    overrides:
      pinnedInput.audioMix && typeof pinnedInput.audioMix === 'object' ? pinnedInput.audioMix : {}
  })

  let cinematicDirectorPlan = null
  let cinematicDirectorDegraded = false
  let storyMemorySnapshot = null
  let memorySummaryForClient = null
  let worldStateSnapshot = null
  let relationshipSnapshot = null
  let creatorPreferencesPatch = null
  let sceneOrchestration = null
  let renderAssemblyPlan = null
  const skipOrchestration = fast || pinnedInput.performancePreferLow
  if (!skipOrchestration) {
    try {
      const evolution = buildSceneOrchestratedPlan({
        script,
        input: {
          ...pinnedInput,
          priorMemorySummary: pinnedInput.priorMemorySummary || '',
          priorWorldState: pinnedInput.priorWorldState || null,
          priorRelationships: pinnedInput.priorRelationships || [],
          creatorPreferences: pinnedInput.creatorPreferences || null,
          directorPersonalityPreference: pinnedInput.directorPersonalityPreference || 'auto',
          performancePreferLow: pinnedInput.performancePreferLow
        },
        storyAudioPlan,
        story: finalStory,
        priorMemorySummary: pinnedInput.priorMemorySummary || '',
        projectId: pinnedInput.projectId
      })
      cinematicDirectorPlan = evolution.cinematicDirectorPlan
      storyAudioPlan = evolution.storyAudioPlan
      storyMemorySnapshot = evolution.storyMemorySnapshot
      memorySummaryForClient = evolution.memorySummaryPatch
      worldStateSnapshot = evolution.worldStateSnapshot
      relationshipSnapshot = evolution.relationshipSnapshot
      creatorPreferencesPatch = evolution.creatorPreferencesPatch
      sceneOrchestration = evolution.sceneOrchestration ?? null
      renderAssemblyPlan = evolution.renderAssemblyPlan ?? null
    } catch (e) {
      cinematicDirectorDegraded = true
      console.warn('[sceneOrchestrationPipeline] fallback to base audio plan:', e?.message || e)
    }
  } else {
    cinematicDirectorDegraded = true
  }
  const vsProfile = resolveStyleProfile(pinnedInput)
  const vsHybrid = detectStyleHybridRequested(pinnedInput)
  return {
    story: finalStory,
    script,
    images,
    audio,
    metadata: {
      country: pinnedInput.country,
      region,
      genre: pinnedInput.genre,
      theme: pinnedInput.theme,
      length: pinnedInput.length,
      storyLanguage: pinnedInput.storyLanguage,
      generationBlueprint: pinnedInput.__generationBlueprintMeta,
      aiProviders: providersUsed,
      ambientBedUrl,
      storyAudioPlan,
      ...(cinematicDirectorPlan ? { cinematicDirectorPlan } : {}),
      ...(cinematicDirectorDegraded ? { cinematicDirectorDegraded: true } : {}),
      ...(storyMemorySnapshot ? { storyMemorySnapshot } : {}),
      ...(memorySummaryForClient ? { memorySummaryPatch: memorySummaryForClient } : {}),
      ...(worldStateSnapshot ? { worldStateSnapshot } : {}),
      ...(relationshipSnapshot?.length ? { relationshipSnapshot } : {}),
      ...(creatorPreferencesPatch ? { creatorPreferencesPatch } : {}),
      ...(sceneOrchestration ? { sceneOrchestration } : {}),
      ...(renderAssemblyPlan ? { renderAssemblyPlan } : {}),
      visualStyleProfileKey: vsProfile.key,
      visualStyleHybrid: vsHybrid,
      ...(fast ? { serverlessFastPath: true } : {})
    }
  }
}

