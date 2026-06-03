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
import { createPipelineBudget, PipelineYieldError } from '../utils/pipelineBudget.js'
import {
  capScriptScenes,
  serverlessMaxScriptScenes
} from '../utils/serverlessSceneLimits.js'
import {
  runLongStoryIntelligence,
  enrichContextMemoryFromOutputs
} from '../storyIntelligence/longStoryOrchestrator.js'
import { normalizeScriptJson } from '../utils/normalizeScriptJson.js'
import { buildFallbackScriptFromStory } from '../../shared/fallbackScriptFromStory.js'
import { attachComposedNarrationToScript } from '../cinematic/cinematicStoryWriting.js'
import {
  analyzeNamingPolicy,
  enrichStoryCharacterProfiles,
  sanitizeStoryCharacters
} from '../character/characterIdentityMemory.js'
import { mergeBibleCharactersIntoCast } from '../utils/mergeBibleCharacters.js'
import { safeLog } from '../../api/_lib/log.js'
import { analyzeProductionIntent } from '../services/ai-director/intentAnalyzer.js'
import { buildAllSceneProductionStates } from '../services/cinematic/sceneProductionState.js'
import { buildProductionMemory } from '../services/story-memory/productionMemoryStore.js'
import { buildSmartContinuityPack } from '../services/continuity/smartContinuityEngine.js'
import {
  buildMasterStoryContextDeterministic,
  buildMasterStoryContextAiPrompt,
  mergeMasterStoryContext,
  masterStoryContextPromptBlock
} from '../cinematic/masterStoryContext.js'
import { pipelineStageLog } from '../utils/pipelineStageLog.js'
import { buildStoryBible } from '../cinematic/storyBible.js'
import { buildAllCharacterDNA } from '../cinematic/characterDNA.js'

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
function buildYieldResult(partial, pinnedInput, region, providersUsed, extraMeta = {}) {
  return {
    story: partial.story || null,
    script: Array.isArray(partial.script) ? partial.script : [],
    images: Array.isArray(partial.images) ? partial.images : [],
    audio: Array.isArray(partial.audio) ? partial.audio : [],
    metadata: {
      country: pinnedInput.country,
      region,
      genre: pinnedInput.genre,
      theme: pinnedInput.theme,
      storyLanguage: pinnedInput.storyLanguage,
      pipelineCheckpoint: extraMeta.checkpoint || 'partial',
      pipelineResumable: true,
      aiProviders: providersUsed,
      ...extraMeta
    }
  }
}

export async function runKathaPipeline(input, req, opts = {}) {
  const onProgress = typeof opts?.onProgress === 'function' ? opts.onProgress : null
  const budget = opts.budget || createPipelineBudget()
  const normalized = normalizePipelineInput(input)
  const pipelinePhase = String(normalized.pipelinePhase || input.pipelinePhase || 'full').trim() || 'full'
  const resumeStory = input.resumeStory && typeof input.resumeStory === 'object' ? input.resumeStory : null
  const region = getRegionForCountry(normalized.country)
  const blueprintPack = buildGenerationBlueprint(normalized)
  let pinnedInput = {
    ...normalized,
    __generationBlueprint: blueprintPack.blueprintBlock,
    __storyLanguageDisplay: 'English',
    __generationBlueprintMeta: blueprintPack.compactMeta
  }

  let longStoryPlan = { active: false }
  const storyOnlyPhase = pipelinePhase === 'story'
  try {
    if (!resumeStory && (!isServerlessRuntime() || !storyOnlyPhase)) {
      longStoryPlan = runLongStoryIntelligence(pinnedInput, { onProgress })
    }
    if (longStoryPlan?.active && longStoryPlan.blueprintBlock) {
      pinnedInput = {
        ...pinnedInput,
        __longStoryIntelligence: longStoryPlan,
        __generationBlueprint: `${pinnedInput.__generationBlueprint}\n\n${longStoryPlan.blueprintBlock}`
      }
    }
  } catch (e) {
    safeLog('warn', 'long-story intelligence skipped', {
      message: e instanceof Error ? e.message : String(e)
    })
  }

  const memory = await getMemoryStore()

  const providersUsed = {}

  if (resumeStory) {
    if (onProgress) {
      onProgress({ stage: 'resume', progress: 38, message: 'Continuing from saved story…' })
    }
    if (input.__masterStoryContext || input.masterStoryContext) {
      pinnedInput = {
        ...pinnedInput,
        __masterStoryContext: input.__masterStoryContext || input.masterStoryContext,
        __masterStoryContextBlock: masterStoryContextPromptBlock(
          input.__masterStoryContext || input.masterStoryContext
        )
      }
    }
    return continuePipelineFromStory(
      pinnedInput,
      region,
      resumeStory,
      req,
      providersUsed,
      onProgress,
      memory,
      { budget }
    )
  }

  let productionIntent = null
  try {
    if (!isServerlessRuntime() || !storyOnlyPhase) {
      productionIntent = await analyzeProductionIntent(pinnedInput, { onProgress })
    }
    if (productionIntent) {
      pinnedInput = {
        ...pinnedInput,
        __productionDirectives: productionIntent.directives,
        __productionDirectivesBlock: productionIntent.promptBlock,
        __agentCouncil: productionIntent.agentCouncil,
        __productionIntentMeta: {
          provider: productionIntent.intentProvider,
          analyzedAt: productionIntent.analyzedAt
        },
        generationMode: productionIntent.directives.generationMode
      }
      providersUsed.intentAnalyzer = productionIntent.intentProvider
    }
  } catch (e) {
    safeLog('warn', 'production_intent_skipped', {
      message: e instanceof Error ? e.message : String(e)
    })
  }

  // Stage 1 — Story generation (auto: OpenAI → Gemini → DeepSeek)
  if (onProgress) onProgress({ stage: 'story', progress: 8, message: 'Drafting story' })
  const storyPrompt = buildStoryPrompt({ ...pinnedInput, region, memory })

  const { json: story, provider: storyProvider } = await aiJsonAuto({
    purpose: 'story',
    schemaHint: 'Story',
    prompt: storyPrompt,
    order: ['openai', 'gemini', 'deepseek']
  })
  providersUsed.story = storyProvider
  budget.checkpoint('story', { story })
  pipelineStageLog('story_generated', {
    provider: storyProvider,
    characters: Array.isArray(story?.characters) ? story.characters.length : 0
  })

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
      memory,
      { budget }
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
  return await continuePipelineFromStory(pinnedInput, region, story, req, providersUsed, onProgress, memory, {
    budget
  })
}

async function continuePipelineFromStory(
  pinnedInput,
  region,
  story,
  req,
  providersUsed,
  onProgress,
  memory,
  opts = {}
) {
  const budget = opts.budget || createPipelineBudget()
  const pipelinePhase = String(pinnedInput.pipelinePhase || 'full').trim() || 'full'
  const scriptResumePhase = pipelinePhase === 'script'
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

    if (!scriptResumePhase) {
      finalStory = await maybeBlueprintRepairStory({
        pinnedInput,
        region,
        memory,
        finalStory,
        providersUsed,
        onProgress
      })
    }
  }

  const longPlan = pinnedInput.__longStoryIntelligence
  if (longPlan?.active) {
    longPlan.contextMemory = enrichContextMemoryFromOutputs(
      longPlan.contextMemory,
      finalStory,
      null
    )
  }

  const namingPolicy = analyzeNamingPolicy(pinnedInput.seedLine || '', pinnedInput.theme || '')
  if (Array.isArray(finalStory?.characters)) {
    const sanitized = sanitizeStoryCharacters(finalStory.characters, namingPolicy)
    const mergedCast = enrichStoryCharacterProfiles(
      mergeBibleCharactersIntoCast(sanitized, pinnedInput.bibleCharacters),
      { country: pinnedInput.country, theme: pinnedInput.theme }
    )
    const castWithDNA = buildAllCharacterDNA(mergedCast, {
      country: pinnedInput.country,
      theme: pinnedInput.theme,
      setting: finalStory?.setting,
      storyLanguage: pinnedInput.storyLanguage
    }).map((dna, i) => ({ ...mergedCast[i], characterDNA: dna, outfitLock: dna.outfitLock }))
    finalStory = {
      ...finalStory,
      characters: castWithDNA
    }
    console.info('[katha:character]', 'story_cast_policy', {
      mode: namingPolicy.mode,
      count: finalStory.characters.length,
      withRefs: castWithDNA.filter((c) => Array.isArray(c.referenceImages) && c.referenceImages.length).length
    })
    pipelineStageLog('character_profiles_created', { count: finalStory.characters.length })
    pinnedInput.__storyBible = buildStoryBible(finalStory, pinnedInput, [], region)
    pinnedInput.__characterDNA = castWithDNA.map((c) => c.characterDNA)
  }

  // Stage 3b — Master story context + character identity memory (before screenplay)
  if (onProgress) {
    onProgress({
      stage: 'master_context',
      progress: 42,
      message: 'Building master story context and character locks…'
    })
  }
  let masterStoryContext =
    pinnedInput.__masterStoryContext && typeof pinnedInput.__masterStoryContext === 'object'
      ? pinnedInput.__masterStoryContext
      : buildMasterStoryContextDeterministic(finalStory, pinnedInput, region)
  if (!pinnedInput.__masterStoryContext && !fast && !isServerlessRuntime()) {
    try {
      const { json: ctxAi, provider: ctxProvider } = await aiJsonAuto({
        purpose: 'master_story_context',
        schemaHint: 'MasterStoryContext',
        prompt: buildMasterStoryContextAiPrompt(finalStory, pinnedInput, region, masterStoryContext),
        order: ['deepseek', 'openai', 'gemini']
      })
      masterStoryContext = mergeMasterStoryContext(masterStoryContext, ctxAi)
      providersUsed.masterStoryContext = ctxProvider
    } catch (e) {
      safeLog('warn', 'master_story_context_fallback', {
        message: e instanceof Error ? e.message : String(e)
      })
    }
  }
  pinnedInput = {
    ...pinnedInput,
    __masterStoryContext: masterStoryContext,
    __masterStoryContextBlock: masterStoryContextPromptBlock(masterStoryContext),
    screenplayLanguage: pinnedInput.screenplayLanguage || 'en',
    __storyLanguageDisplay: 'English',
    __regionalContextDisplay: masterStoryContext.regionalContext
  }

  budget.checkpoint('master_context', { story: finalStory, masterStoryContext })

  const yieldStoryOnly =
    pipelinePhase === 'story' ||
    (isServerlessRuntime() && budget.shouldStop() && !scriptResumePhase)

  if (yieldStoryOnly) {
    throw new PipelineYieldError(
      buildYieldResult(
        { story: finalStory, script: [] },
        pinnedInput,
        region,
        providersUsed,
        {
          checkpoint: 'story_ready',
          masterStoryContext,
          outputLanguage: 'English',
          regionalContext: masterStoryContext.regionalContext,
          productionStage: 'writing'
        }
      ),
      'story_ready'
    )
  }

  // Stage 4 — Script generation (auto: OpenAI → Gemini → DeepSeek)
  if (onProgress) {
    const n = longPlan?.targetSceneCount
    onProgress({
      stage: 'script',
      progress: 50,
      message: n ? `Writing screenplay (${n} scenes)` : 'Writing script'
    })
  }
  const { json: scriptRaw, provider: scriptProvider } = await aiJsonAuto({
    purpose: 'script',
    schemaHint: 'Script',
    prompt: buildScriptPrompt({ story: finalStory, input: pinnedInput, region }),
    order: ['openai', 'gemini', 'deepseek']
  })
  let script = normalizeScriptJson(scriptRaw)
  if (!script.length) {
    safeLog('warn', 'script_normalize_empty', { provider: scriptProvider })
    const { json: scriptRetryRaw, provider: scriptRetryProvider } = await aiJsonAuto({
      purpose: 'script',
      schemaHint: 'Script',
      prompt: `${buildScriptPrompt({ story: finalStory, input: pinnedInput, region })}\n\nReturn ONLY a JSON array of 6-8 objects. Each object MUST include: scene (number), narration (string), visual_description (string), dialogue (array of {character,line}).`,
      order: ['openai', 'gemini', 'deepseek']
    })
    script = normalizeScriptJson(scriptRetryRaw)
    if (script.length) providersUsed.script = scriptRetryProvider
  }
  if (!script.length) {
    const targetN =
      Number(pinnedInput.__longStoryIntelligence?.targetSceneCount) ||
      Number(longPlan?.targetSceneCount) ||
      8
    script = buildFallbackScriptFromStory(finalStory, targetN)
    providersUsed.script = 'fallback_deterministic'
    safeLog('warn', 'script_fallback_from_story', { scenes: script.length })
  }
  const maxScenes = serverlessMaxScriptScenes(pinnedInput)
  script = capScriptScenes(script, maxScenes)
  script = attachComposedNarrationToScript(script, finalStory)
  budget.checkpoint('script', { story: finalStory, script })
  console.info('[katha:story-writing]', 'script_enriched', {
    scenes: script.length,
    withDialogue: script.filter((r) => Array.isArray(r.dialogue) && r.dialogue.length > 0).length
  })
  pipelineStageLog('scene_descriptions_created', { count: script.length })
  providersUsed.script = scriptProvider

  if (masterStoryContext?.memory) {
    masterStoryContext.memory.scene_context_memory = script.map((row, i) => ({
      scene: Number(row?.scene) > 0 ? Number(row.scene) : i + 1,
      summary: String(row.visual_description || row.narration || '').slice(0, 200)
    }))
  }

  if (longPlan?.active) {
    longPlan.contextMemory = enrichContextMemoryFromOutputs(
      longPlan.contextMemory,
      finalStory,
      script
    )
  }

  const scriptOnly = pinnedInput.scriptOnly === true

  // Stage 5 — Visuals + audio (skipped in script-only / screenplay review mode)
  let images = []
  let audio = []
  if (scriptOnly) {
    if (onProgress) {
      onProgress({
        stage: 'script_review',
        progress: 72,
        message: 'Script ready — review before generating visuals'
      })
    }
    console.info('[katha:pipeline]', 'script_only_complete', { scenes: script.length })
  } else {
    if (onProgress) onProgress({ stage: 'images', progress: 65, message: 'Generating images + audio' })
    ;[images, audio] = await Promise.all([
      leonardoGenerateForScript({
        script,
        input: pinnedInput,
        region,
        onProgress,
        characters: finalStory?.characters || story?.characters || []
      }),
      ttsGenerateForScript({ script, input: pinnedInput, region, req, story: finalStory })
    ])
  }

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
  let qualityReport = null
  const scriptOnlyStage = pinnedInput.scriptOnly === true
  const studioOrchestration =
    !scriptOnlyStage &&
    (process.env.KATHA_STUDIO_ORCHESTRATION === '1' || pinnedInput.studioOrchestration === true)
  let skipOrchestration =
    (fast || pinnedInput.performancePreferLow || budget.shouldYieldOptional()) && !studioOrchestration
  if (scriptOnlyStage && isServerlessRuntime()) skipOrchestration = true
  if (!skipOrchestration) {
    try {
      const evolution = buildSceneOrchestratedPlan({
        script,
        input: {
          ...pinnedInput,
          longStoryIntelligence: longPlan?.active ? longPlan : null,
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
      qualityReport = evolution.qualityReport ?? sceneOrchestration?.premiumStudio?.qualityReport ?? null
    } catch (e) {
      cinematicDirectorDegraded = true
      console.warn('[sceneOrchestrationPipeline] fallback to base audio plan:', e?.message || e)
    }
  } else {
    cinematicDirectorDegraded = true
  }
  const vsProfile = resolveStyleProfile(pinnedInput)
  const vsHybrid = detectStyleHybridRequested(pinnedInput)
  const directives = pinnedInput.__productionDirectives || null
  let continuityPack = null
  let sceneProductionStates = null
  let productionMemory = null
  try {
    continuityPack = buildSmartContinuityPack({
      story: finalStory,
      script,
      images,
      priorWorld: pinnedInput.priorWorldState,
      characterReference: pinnedInput.characterReference,
      bibleCharacters: pinnedInput.bibleCharacters
    })
    sceneProductionStates = buildAllSceneProductionStates(script, {
      directives,
      continuityPack
    })
    productionMemory = buildProductionMemory({
      story: finalStory,
      script,
      directives,
      agentCouncil: pinnedInput.__agentCouncil,
      continuityPack,
      priorMemorySummary: pinnedInput.priorMemorySummary || '',
      enrichedScenes: sceneOrchestration?.enrichedScenes || []
    })
  } catch (e) {
    safeLog('warn', 'production_metadata_skipped', {
      message: e instanceof Error ? e.message : String(e)
    })
  }
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
      outputLanguage: masterStoryContext?.outputLanguage || 'English',
      regionalContext: masterStoryContext?.regionalContext,
      masterStoryContext,
      ...(pinnedInput.__storyBible ? { storyBible: pinnedInput.__storyBible } : {}),
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
      ...(qualityReport ? { qualityReport } : {}),
      ...(cinematicDirectorPlan?.cinematicBookends
        ? { cinematicBookends: cinematicDirectorPlan.cinematicBookends }
        : {}),
      visualStyleProfileKey: vsProfile.key,
      visualStyleHybrid: vsHybrid,
      ...(fast ? { serverlessFastPath: true } : {}),
      ...(longPlan?.active
        ? {
            longStoryIntelligence: {
              active: true,
              seedChars: longPlan.seedChars,
              targetSceneCount: longPlan.targetSceneCount,
              sceneCount: longPlan.sceneOutline?.length || 0,
              dramaticBeats: longPlan.structure?.dramaticBeats || [],
              pacingProfile: longPlan.structure?.pacingProfile
            }
          }
        : {}),
      ...(scriptOnly ? { scriptOnlyComplete: true, productionStage: 'script_review' } : {}),
      ...(directives ? { productionDirectives: directives } : {}),
      ...(pinnedInput.__agentCouncil ? { agentCouncil: pinnedInput.__agentCouncil } : {}),
      ...(pinnedInput.__productionIntentMeta ? { productionIntent: pinnedInput.__productionIntentMeta } : {}),
      ...(sceneProductionStates?.length ? { sceneProductionStates } : {}),
      ...(productionMemory ? { productionMemory } : {}),
      ...(continuityPack ? { continuityPack } : {})
    }
  }
}

