/**
 * Stage 2 — Visual + narration generation from approved script only.
 */

import { leonardoGenerateForScript } from '../services/leonardoService.js'
import { ttsGenerateForScript } from '../services/ttsService.js'
import { getRegionForCountry } from '../utils/regionData.js'
import { normalizePipelineInput } from '../utils/generationBlueprint.js'
import { normalizeProductionDirectives } from '../services/ai-director/productionDirectives.js'
import { buildSmartContinuityPack, continuityBlockForScene } from '../services/continuity/smartContinuityEngine.js'
import { buildAllSceneVisualBlueprints } from '../services/cinematic/cinematicVisualBlueprint.js'
import {
  attachPortraitUrlsToLocks,
  buildCharacterVisualLocks,
  buildPermanentCharacterProfiles,
  characterConsistencyPromptBlock
} from '../services/cinematic/characterConsistencyEngine.js'
import {
  attachSceneVisualBriefsToScript,
  buildStoryBible
} from '../cinematic/storyBible.js'
import { buildAllCharacterDNA } from '../cinematic/characterDNA.js'
import {
  assertCharacterPortraitsReady,
  ensureCharacterPortraits
} from '../cinematic/characterPortraitPipeline.js'
import { validateStoryForVisualPipeline } from '../cinematic/storyPipelineGate.js'
import { enrichScriptRowsForVisuals } from '../utils/sceneVisualIntelligence.js'
import { pipelineStageLog, isStrictImagePipeline } from '../utils/pipelineStageLog.js'
import {
  buildStoryboardDirectorPlan,
  storyboardDirectorPromptBlock
} from '../services/cinematic/cinematicStoryboardDirector.js'
import { buildAllSceneProductionStates } from '../services/cinematic/sceneProductionState.js'
import { buildProductionMemory } from '../services/story-memory/productionMemoryStore.js'
import {
  masterStoryContextPromptBlock,
  buildScenePromptFromMasterContext,
  priorSceneSummaryFromRow
} from '../cinematic/masterStoryContext.js'

/**
 * @param {object} opts
 * @param {object[]} opts.script full or filtered script rows
 * @param {object} opts.story story JSON (cast)
 * @param {object} opts.input studio fields (styleId, aspectMode, characterReference, …)
 * @param {import('http').IncomingMessage} [opts.req]
 * @param {(p: object) => void} [opts.onProgress]
 * @param {number[]} [opts.sceneIndices] 1-based scene numbers to generate; default all rows
 */
export async function runKathaVisualPipeline(opts = {}) {
  const input = normalizePipelineInput(opts.input || {})
  const region = getRegionForCountry(input.country)
  const scriptAll = Array.isArray(opts.script) ? opts.script : []
  const wanted = Array.isArray(opts.sceneIndices) ? new Set(opts.sceneIndices.map(Number)) : null

  const scriptFiltered = wanted?.size
    ? scriptAll.filter((row, i) => {
        const n = Number(row?.scene)
        const key = Number.isFinite(n) && n > 0 ? n : i + 1
        return wanted.has(key)
      })
    : scriptAll

  if (!scriptFiltered.length) {
    throw new Error('No script scenes to generate visuals for.')
  }

  const story = opts.story && typeof opts.story === 'object' ? opts.story : {}
  const storyCastRaw = Array.isArray(story.characters)
    ? story.characters
    : Array.isArray(input.bibleCharacters)
      ? input.bibleCharacters
      : []
  if (!storyCastRaw.length) {
    throw new Error('Character profiles are required before scene image generation.')
  }
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null

  const storyCast = validateStoryForVisualPipeline(story, scriptFiltered, input)
  const castWithDNA = buildAllCharacterDNA(storyCast, {
    country: input.country,
    theme: input.theme || input.seedLine,
    setting: story?.setting,
    storyLanguage: input.storyLanguage
  }).map((dna, i) => ({ ...storyCast[i], characterDNA: dna, outfitLock: dna.outfitLock }))
  story.characters = castWithDNA

  if (onProgress) {
    onProgress({ stage: 'character_portraits', progress: 2, message: 'Generating character portraits…' })
  }
  const castWithPortraits = await ensureCharacterPortraits(castWithDNA, input, onProgress)
  story.characters = castWithPortraits
  if (isStrictImagePipeline()) {
    assertCharacterPortraitsReady(castWithPortraits)
  }

  const permanentProfiles = buildPermanentCharacterProfiles(castWithPortraits)
  pipelineStageLog('character_profiles_created', { count: permanentProfiles.length })

  const storyBible = buildStoryBible(story, input, scriptFiltered, region)
  const scriptBriefed = attachSceneVisualBriefsToScript(scriptFiltered, storyBible, {
    bibleCharacters: castWithPortraits
  })
  const script = enrichScriptRowsForVisuals(scriptBriefed, input, story)
  pipelineStageLog('scene_descriptions_created', { count: script.length })
  const directives = normalizeProductionDirectives(
    opts.productionDirectives || opts.directives || input.__productionDirectives || {}
  )
  const continuityPack = buildSmartContinuityPack({
    story,
    script,
    images: [],
    priorWorld: input.priorWorldState,
    characterReference: input.characterReference,
    bibleCharacters: input.bibleCharacters
  })

  const castMemory = continuityPack.castMemory || []
  const characterLocks = attachPortraitUrlsToLocks(
    buildCharacterVisualLocks(
      Array.isArray(story?.characters) ? story.characters : input.bibleCharacters || [],
      input.characterVisualLocks
    ),
    castWithPortraits.length ? castWithPortraits : input.bibleCharacters || []
  )
  const characterBlock = characterConsistencyPromptBlock(characterLocks)
  const storyboardPlan = buildStoryboardDirectorPlan(script, directives)
  const storyboardBlock = storyboardDirectorPromptBlock(storyboardPlan)

  const masterCtx = input.__masterStoryContext || input.masterStoryContext
  const masterBlock =
    String(input.__masterStoryContextBlock || '').trim() ||
    (masterCtx ? masterStoryContextPromptBlock(masterCtx) : '')

  const sceneMasterBlocks = script.map((row, i) => {
    const sceneNum = Number(row?.scene) > 0 ? Number(row.scene) : i + 1
    const prior = i > 0 ? priorSceneSummaryFromRow(script[i - 1]) : ''
    return masterCtx
      ? buildScenePromptFromMasterContext(masterCtx, row, sceneNum, prior)
      : ''
  })

  const inputWithContinuity = {
    ...input,
    __story: story,
    __storyBible: storyBible,
    __characterDNA: storyBible.characterDNA || castWithPortraits.map((c) => c.characterDNA),
    __permanentCharacterProfiles: permanentProfiles,
    seedLine: input.seedLine || input.theme,
    __masterStoryContext: masterCtx,
    __masterStoryContextBlock: masterBlock,
    __sceneMasterContextBlocks: sceneMasterBlocks,
    __productionDirectives: directives,
    __continuityPack: continuityPack,
    __characterVisualLocks: characterLocks,
    __characterConsistencyBlock: characterBlock,
    __storyboardDirectorBlock: storyboardBlock,
    __sceneContinuityBlocks: script.map((row, i) => {
      const sceneNum = Number(row?.scene) > 0 ? Number(row.scene) : i + 1
      return continuityBlockForScene(continuityPack, sceneNum)
    }),
    __characterReferencePrompt: [input.__characterReferencePrompt, characterBlock, storyboardBlock]
      .filter(Boolean)
      .join('\n')
  }

  const sceneBlueprints = buildAllSceneVisualBlueprints(script, inputWithContinuity, {
    directives,
    continuityPack,
    castMemory,
    seedLine: input.seedLine || input.theme
  }).map((bp, i) => ({
    ...bp,
    directorNote: [bp.directorNote, sceneMasterBlocks[i]].filter(Boolean).join(' ').slice(0, 900)
  }))
  inputWithContinuity.__sceneBlueprints = sceneBlueprints

  if (onProgress) {
    onProgress({ stage: 'visuals', progress: 5, message: 'Starting cinematic visuals…' })
  }

  pipelineStageLog('image_prompts_queued', { scenes: script.length })

  const [images, audio] = await Promise.all([
    leonardoGenerateForScript({
      script,
      input: inputWithContinuity,
      region,
      onProgress,
      characters: castWithPortraits,
      sceneBlueprints,
      projectId: input.projectId || story.id,
      strict: isStrictImagePipeline(),
      allowServerlessLeonardo: true
    }),
    ttsGenerateForScript({
      script,
      input: inputWithContinuity,
      region,
      req: opts.req,
      story
    })
  ])

  const imageList = Array.isArray(images) ? images : []
  const placeholders = imageList.filter((r) => r?.status === 'placeholder').length
  if (isStrictImagePipeline() && imageList.length === 0) {
    throw new Error('Visual generation returned no scene images — check Leonardo API key and prompts.')
  }
  if (placeholders > 0) {
    pipelineStageLog('visual_placeholders', { count: placeholders, total: script.length })
  }

  if (onProgress) {
    onProgress({ stage: 'done', progress: 100, message: 'Visual generation complete' })
  }
  pipelineStageLog('generation_completed', { scenes: imageList.length, scriptScenes: script.length })

  const continuityPackFinal = buildSmartContinuityPack({
    story,
    script,
    images,
    priorWorld: input.priorWorldState,
    characterReference: input.characterReference,
    bibleCharacters: input.bibleCharacters
  })
  const sceneProductionStates = buildAllSceneProductionStates(script, {
    directives,
    continuityPack: continuityPackFinal
  }).map((st) => {
    const sceneNum = Number(String(st.continuityId || '').replace('scene:', '')) || 0
    const hasImg = images.some((im) => Number(im?.scene) === sceneNum && (im.image_url || im.imageUrl))
    return { ...st, imageStatus: hasImg ? 'ready' : st.imageStatus, reviewed: false }
  })
  const productionMemory = buildProductionMemory({
    story,
    script,
    directives,
    continuityPack: continuityPackFinal,
    priorMemorySummary: input.priorMemorySummary || ''
  })

  return {
    images: Array.isArray(images) ? images : [],
    audio: Array.isArray(audio) ? audio : [],
    metadata: {
      region,
      sceneCount: script.length,
      visualGeneration: true,
      ...(masterCtx ? { masterStoryContext: masterCtx } : {}),
      storyBible,
      bibleCharacters: castWithPortraits,
      productionStage: 'narration_motion',
      productionDirectives: directives,
      sceneProductionStates,
      productionMemory,
      continuityPack: continuityPackFinal,
      sceneVisualBlueprints: sceneBlueprints,
      characterVisualLocks: characterLocks,
      storyboardDirectorPlan: storyboardPlan
    }
  }
}
