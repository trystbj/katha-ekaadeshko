/**
 * Phase 2 Final Evolution — v4 cinematic universe engine atop v3 ultimate plan.
 */

import { buildUltimateCinematicPlan } from './cinematicOrchestrator.js'
import { analyzeSceneContext } from './sceneContext.js'
import { resolveDirectorPersonality, applyDirectorPersonalityToScene } from './directorPersonality.js'
import {
  buildWorldSimulationState,
  worldSimulationBlueprintBlock,
  mergeWorldStateForProject
} from './worldSimulation.js'
import {
  buildRelationshipGraph,
  relationshipBlueprintBlock,
  applyRelationshipInfluenceToScene
} from './emotionalRelationshipEngine.js'
import {
  inferCinematicReasoning,
  applyReasoningOrchestration,
  buildEpisodeReasoningMeta
} from './cinematicReasoningEngine.js'
import { inferSymbolismCue, applySymbolismToScene } from './symbolismThematic.js'
import { inferMemorySequence, applyMemorySequenceToScene } from './flashbackDreamEngine.js'
import { inferArtEvolutionCue } from './dynamicArtEvolution.js'
import { buildAdvancedRenderPipelineCue } from './advancedRenderPipeline.js'
import { buildTrailerRecapPlan } from './trailerRecapDirector.js'
import { buildInteractiveStoryFoundation } from './interactiveStoryFoundation.js'
import { buildLipSyncFoundation } from './lipSyncFoundation.js'
import {
  learnCreatorPreferences,
  applyCreatorPreferencesToPlan,
  creatorPreferencesBlueprintBlock
} from './creatorPreferenceLearning.js'

/**
 * @param {object} params
 */
export function buildEvolutionCinematicPlan(params) {
  const ultimate = buildUltimateCinematicPlan(params)
  const { script, input, story } = params
  const rows = Array.isArray(script) ? script : []
  const n = rows.length

  if (!ultimate.cinematicDirectorPlan || ultimate.cinematicDirectorPlan.autoDirected === false) {
    return {
      ...ultimate,
      cinematicDirectorPlan: { ...ultimate.cinematicDirectorPlan, version: 4 }
    }
  }

  const priorWorld = input?.priorWorldState || null
  const priorRelationships = input?.priorRelationships || []
  const priorPrefs = input?.creatorPreferences || null

  const worldSimulation = buildWorldSimulationState(story, script, priorWorld)
  const relationships = buildRelationshipGraph(story, script, priorRelationships)
  const directorPersonality = resolveDirectorPersonality(
    input?.styleId,
    input?.genre,
    input?.directorPersonalityPreference || 'auto'
  )

  const scenes = [...(ultimate.cinematicDirectorPlan.scenes || [])]
  for (let i = 0; i < n; i++) {
    const row = rows[i] || {}
    const narration = String(row.narration || '')
    const visual = String(row.visual_description || '')
    const blob = `${narration} ${visual}`
    const ctx = analyzeSceneContext({
      narration,
      visualDescription: visual,
      genre: input?.genre,
      storyTone: input?.storyTone
    })

    const reasoning = inferCinematicReasoning(
      ctx,
      i,
      n,
      worldSimulation,
      relationships,
      directorPersonality
    )
    const symbolism = inferSymbolismCue(ctx, blob, i, n)
    const memorySequence = inferMemorySequence(
      ctx,
      blob,
      i,
      ultimate.storyMemorySnapshot
    )
    const artEvolution = inferArtEvolutionCue(ctx, i, n, worldSimulation, symbolism)

    let scene = {
      ...scenes[i],
      reasoning,
      symbolism,
      memorySequence,
      artEvolution
    }

    applyDirectorPersonalityToScene(scene, directorPersonality)
    applyRelationshipInfluenceToScene(scene, relationships)
    applyReasoningOrchestration(scene, reasoning)
    applySymbolismToScene(scene, symbolism)
    applyMemorySequenceToScene(scene, memorySequence)

    scene.renderPipeline = buildAdvancedRenderPipelineCue(
      scene,
      artEvolution,
      memorySequence,
      ultimate.cinematicDirectorPlan.performance
    )
    scenes[i] = scene
  }

  const creatorPreferences = learnCreatorPreferences(input, priorPrefs, directorPersonality)
  applyCreatorPreferencesToPlan(scenes, creatorPreferences)

  const reasoningEngine = buildEpisodeReasoningMeta(scenes)
  const trailerRecap = buildTrailerRecapPlan(
    scenes,
    script,
    ultimate.cinematicDirectorPlan.cliffhanger
  )
  const interactiveFoundation = buildInteractiveStoryFoundation(story, relationships)
  const lipSyncFoundation = buildLipSyncFoundation(
    story,
    ultimate.cinematicDirectorPlan.multiCharacterVoices
  )

  const cinematicDirectorPlan = {
    ...ultimate.cinematicDirectorPlan,
    version: 4,
    scenes,
    reasoningEngine,
    worldSimulation,
    relationships,
    directorPersonality,
    trailerRecap,
    interactiveFoundation,
    lipSyncFoundation,
    creatorPreferences
  }

  return {
    cinematicDirectorPlan,
    storyAudioPlan: ultimate.storyAudioPlan,
    memorySummaryPatch: ultimate.memorySummaryPatch,
    storyMemorySnapshot: ultimate.storyMemorySnapshot,
    worldStateSnapshot: mergeWorldStateForProject(priorWorld, worldSimulation),
    relationshipSnapshot: relationships,
    creatorPreferencesPatch: creatorPreferences
  }
}
