/**
 * Stage 2 — Visual + narration generation from approved script only.
 */

import { leonardoGenerateForScript } from '../services/leonardoService.js'
import { ttsGenerateForScript } from '../services/ttsService.js'
import { getRegionForCountry } from '../utils/regionData.js'
import { normalizePipelineInput } from '../utils/generationBlueprint.js'
import { normalizeProductionDirectives } from '../services/ai-director/productionDirectives.js'
import { buildSmartContinuityPack, continuityBlockForScene } from '../services/continuity/smartContinuityEngine.js'
import { buildAllSceneProductionStates } from '../services/cinematic/sceneProductionState.js'
import { buildProductionMemory } from '../services/story-memory/productionMemoryStore.js'

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

  const script = wanted?.size
    ? scriptAll.filter((row, i) => {
        const n = Number(row?.scene)
        const key = Number.isFinite(n) && n > 0 ? n : i + 1
        return wanted.has(key)
      })
    : scriptAll

  if (!script.length) {
    throw new Error('No script scenes to generate visuals for.')
  }

  const story = opts.story && typeof opts.story === 'object' ? opts.story : {}
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null
  const directives = normalizeProductionDirectives(
    opts.productionDirectives || opts.directives || input.__productionDirectives || {}
  )
  const inputWithContinuity = {
    ...input,
    __productionDirectives: directives,
    __sceneContinuityBlocks: script.map((row, i) => {
      const sceneNum = Number(row?.scene) > 0 ? Number(row.scene) : i + 1
      return continuityBlockForScene(
        buildSmartContinuityPack({
          story,
          script,
          images: [],
          priorWorld: input.priorWorldState,
          bibleCharacters: input.bibleCharacters
        }),
        sceneNum
      )
    })
  }

  if (onProgress) {
    onProgress({ stage: 'visuals', progress: 5, message: 'Starting cinematic visuals…' })
  }

  const [images, audio] = await Promise.all([
    leonardoGenerateForScript({
      script,
      input: inputWithContinuity,
      region,
      onProgress,
      characters: story.characters || []
    }),
    ttsGenerateForScript({
      script,
      input: inputWithContinuity,
      region,
      req: opts.req,
      story
    })
  ])

  if (onProgress) {
    onProgress({ stage: 'done', progress: 100, message: 'Visual generation complete' })
  }

  const continuityPack = buildSmartContinuityPack({
    story,
    script,
    images,
    priorWorld: input.priorWorldState,
    characterReference: input.characterReference,
    bibleCharacters: input.bibleCharacters
  })
  const sceneProductionStates = buildAllSceneProductionStates(script, {
    directives,
    continuityPack
  }).map((st) => {
    const sceneNum = Number(String(st.continuityId || '').replace('scene:', '')) || 0
    const hasImg = images.some((im) => Number(im?.scene) === sceneNum && (im.image_url || im.imageUrl))
    return { ...st, imageStatus: hasImg ? 'ready' : st.imageStatus, reviewed: false }
  })
  const productionMemory = buildProductionMemory({
    story,
    script,
    directives,
    continuityPack,
    priorMemorySummary: input.priorMemorySummary || ''
  })

  return {
    images: Array.isArray(images) ? images : [],
    audio: Array.isArray(audio) ? audio : [],
    metadata: {
      region,
      sceneCount: script.length,
      visualGeneration: true,
      productionStage: 'narration_motion',
      productionDirectives: directives,
      sceneProductionStates,
      productionMemory,
      continuityPack
    }
  }
}
