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
  const storyCast = Array.isArray(story.characters)
    ? story.characters
    : Array.isArray(input.bibleCharacters)
      ? input.bibleCharacters
      : []
  if (!storyCast.length) {
    throw new Error('Character profiles are required before scene image generation.')
  }

  const permanentProfiles = buildPermanentCharacterProfiles(storyCast)
  pipelineStageLog('character_profiles_created', { count: permanentProfiles.length })

  const script = enrichScriptRowsForVisuals(scriptFiltered, input, story)
  pipelineStageLog('scene_descriptions_created', { count: script.length })
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null
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
    input.bibleCharacters || []
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
      characters: story.characters || storyCast,
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
  if (isStrictImagePipeline() && imageList.length < script.length) {
    throw new Error(
      `Visual generation incomplete: ${imageList.length}/${script.length} scene images succeeded.`
    )
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
