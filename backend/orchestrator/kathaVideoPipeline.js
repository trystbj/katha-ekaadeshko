/**
 * Stage 3 — Leonardo motion / video clips from approved scene stills.
 * AI Director policy controls pacing; Leonardo is the render engine.
 */

import { normalizePipelineInput } from '../utils/generationBlueprint.js'
import { normalizeProductionDirectives } from '../services/ai-director/productionDirectives.js'
import { buildSmartContinuityPack } from '../services/continuity/smartContinuityEngine.js'
import { buildProductionMemory } from '../services/story-memory/productionMemoryStore.js'
import { buildAllSceneProductionStates } from '../services/cinematic/sceneProductionState.js'
import { applyCouncilToScriptPlan } from '../services/ai-director/multiAgentCouncil.js'
import { leonardoGenerateVideoForScript } from '../services/animation/leonardoVideoService.js'
import { buildSceneOrchestratedPlan } from '../cinematic/pipeline/sceneOrchestrationPipeline.js'

/**
 * @param {object} opts
 */
export async function runKathaVideoPipeline(opts = {}) {
  const input = normalizePipelineInput(opts.input || {})
  const scriptAll = Array.isArray(opts.script) ? opts.script : []
  const wanted = Array.isArray(opts.sceneIndices) ? new Set(opts.sceneIndices.map(Number)) : null
  const script = wanted?.size
    ? scriptAll.filter((row, i) => {
        const n = Number(row?.scene)
        const key = Number.isFinite(n) && n > 0 ? n : i + 1
        return wanted.has(key)
      })
    : scriptAll

  if (!script.length) throw new Error('No script scenes for video generation.')

  const story = opts.story && typeof opts.story === 'object' ? opts.story : {}
  const images = Array.isArray(opts.images) ? opts.images : []
  const directives = normalizeProductionDirectives(opts.productionDirectives || opts.directives || {})
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null

  if (onProgress) {
    onProgress({ stage: 'video_plan', progress: 5, message: 'Planning cinematic motion…' })
  }

  const councilPlan = applyCouncilToScriptPlan({
    script,
    directives,
    story,
    priorWorld: input.priorWorldState || null
  })

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
  })

  const productionMemory = buildProductionMemory({
    story,
    script,
    directives,
    agentCouncil: opts.agentCouncil,
    continuityPack,
    priorMemorySummary: input.priorMemorySummary || ''
  })

  let renderAssemblyPlan = opts.renderAssemblyPlan || null
  if (!renderAssemblyPlan && (process.env.KATHA_STUDIO_ORCHESTRATION === '1' || input.studioOrchestration)) {
    try {
      const orch = buildSceneOrchestratedPlan({
        script,
        input: { ...input, performancePreferLow: directives.generationMode === 'fast' },
        story,
        priorMemorySummary: input.priorMemorySummary || '',
        projectId: input.projectId
      })
      renderAssemblyPlan = orch.renderAssemblyPlan ?? null
    } catch {
      /* optional */
    }
  }

  if (onProgress) {
    onProgress({ stage: 'video', progress: 12, message: 'Generating Leonardo motion clips…' })
  }

  const videos = await leonardoGenerateVideoForScript({
    script,
    images,
    input,
    directives,
    onProgress
  })

  const sceneStates = sceneProductionStates.map((st, i) => {
    const sceneNum = Number(String(st.continuityId || '').replace('scene:', '')) || i + 1
    const hit = videos.find((v) => Number(v.scene) === sceneNum)
    return {
      ...st,
      videoStatus: hit?.video_url ? 'ready' : st.videoStatus,
      reviewed: false
    }
  })

  if (onProgress) {
    onProgress({ stage: 'done', progress: 100, message: 'Video generation complete' })
  }

  return {
    videos: Array.isArray(videos) ? videos : [],
    metadata: {
      videoGeneration: true,
      generationMode: directives.generationMode || 'cinematic',
      productionStage: 'video_assembly',
      sceneProductionStates: sceneStates,
      productionMemory,
      continuityPack,
      councilPlan,
      renderAssemblyPlan
    }
  }
}
