/**
 * Ultimate cinematic orchestrator — extends v2 director plan with camera, acting, memory, music, timeline, VFX.
 */

import { buildCinematicDirectorPlan, enhanceStoryAudioWithCinematicDirector } from './cinematicDirector.js'
import { analyzeSceneContext } from './sceneContext.js'
import { inferNarrativePhase } from '../utils/buildStoryAudioPlan.js'
import { inferCameraDirector } from './cameraDirector.js'
import { inferCharacterActing } from './characterActing.js'
import { inferEnvironmentReaction } from './environmentReaction.js'
import { inferSceneComposition } from './sceneComposition.js'
import { inferVisualEffects } from './visualEffectsDirector.js'
import { inferSceneMusic } from './cinematicMusicDirector.js'
import { buildEpisodePacingPlan, inferScenePacingBeat } from './storyPacingEngine.js'
import { buildSceneTimelineLayers, buildMasterTimeline } from './timelineOrchestrator.js'
import {
  buildStoryMemorySnapshot,
  mergeMemorySummaryForProject
} from './storyMemoryContinuity.js'
import { inferCliffhangerPlan } from './cliffhangerDirector.js'
import { buildCharacterVoiceCast } from './multiCharacterVoice.js'
import { inferSmartPerformanceProfile } from './smartPerformance.js'
import { buildCommunityFoundationMeta } from './communityFoundation.js'

/**
 * Full ultimate plan + optional memory merge text for project persistence.
 * @param {object} params
 */
export function buildUltimateCinematicPlan(params) {
  const { script, input, storyAudioPlan, story, priorMemorySummary, projectId } = params
  const basePlan = buildCinematicDirectorPlan({ script, input, storyAudioPlan })
  const rows = Array.isArray(script) ? script : []
  const n = rows.length
  const styleId = input?.styleId || 'soft_anime_fantasy'
  const secondsPerScene = storyAudioPlan?.secondsPerScene ?? 4
  const autoDirected = basePlan.autoDirected !== false

  if (!autoDirected) {
    return {
      cinematicDirectorPlan: { ...basePlan, version: 3 },
      storyAudioPlan,
      memorySummaryPatch: null
    }
  }

  const enrichedScenes = []
  for (let i = 0; i < n; i++) {
    const baseScene = basePlan.scenes[i] || {}
    const row = rows[i] || {}
    const narration = String(row.narration || '')
    const visual = String(row.visual_description || '')
    const ctx = analyzeSceneContext({
      narration,
      visualDescription: visual,
      genre: input?.genre,
      storyTone: input?.storyTone
    })
    const phase = inferNarrativePhase(i, n, narration, visual, input?.storyTone)
    const environment = baseScene.environment || inferEnvironmentReaction(ctx, styleId, input?.storyTone)
    const expression = baseScene.expression
    const camera = inferCameraDirector(ctx, styleId, phase)
    const acting = inferCharacterActing(ctx, expression, styleId)
    const composition = inferSceneComposition(ctx, styleId)
    const vfx = inferVisualEffects(ctx, styleId, environment)
    const music = inferSceneMusic(ctx, phase, styleId)

    const sceneDraft = {
      ...baseScene,
      camera,
      acting,
      composition,
      vfx,
      music,
      motion: { preset: camera.preset || baseScene.motion?.preset }
    }

    enrichedScenes.push(sceneDraft)
  }

  const episodePacing = buildEpisodePacingPlan(enrichedScenes)
  for (let i = 0; i < enrichedScenes.length; i++) {
    const ctx = analyzeSceneContext({
      narration: rows[i]?.narration,
      visualDescription: rows[i]?.visual_description,
      genre: input?.genre,
      storyTone: input?.storyTone
    })
    enrichedScenes[i].pacing = inferScenePacingBeat(ctx, i, n, episodePacing)
    enrichedScenes[i].timeline = buildSceneTimelineLayers(enrichedScenes[i], secondsPerScene)
  }

  const storyMemory = buildStoryMemorySnapshot(story, script, priorMemorySummary)
  const memorySummaryPatch = mergeMemorySummaryForProject(priorMemorySummary, storyMemory)
  const cliffhanger = inferCliffhangerPlan(script, story, input?.genre)
  const multiCharacterVoices = buildCharacterVoiceCast(story, input)
  const performance = inferSmartPerformanceProfile({
    sceneCount: n,
    preferLow: input?.performancePreferLow === true
  })
  const community = buildCommunityFoundationMeta(projectId, story, input?.genre)
  const masterTimeline = buildMasterTimeline(enrichedScenes, secondsPerScene)

  const cinematicDirectorPlan = {
    ...basePlan,
    version: 3,
    scenes: enrichedScenes,
    storyMemory,
    episodePacing,
    cliffhanger,
    multiCharacterVoices,
    performance,
    community,
    masterTimeline
  }

  let enhancedAudio = enhanceStoryAudioWithCinematicDirector(
    storyAudioPlan,
    cinematicDirectorPlan,
    script,
    secondsPerScene
  )

  if (enhancedAudio?.segments) {
    enhancedAudio = {
      ...enhancedAudio,
      segments: enhancedAudio.segments.map((seg, i) => ({
        ...seg,
        musicTheme: enrichedScenes[i]?.music?.theme ?? 'neutral',
        musicTransition: enrichedScenes[i]?.music?.transition ?? 'hold'
      }))
    }
  }

  return {
    cinematicDirectorPlan,
    storyAudioPlan: enhancedAudio,
    memorySummaryPatch,
    storyMemorySnapshot: storyMemory
  }
}
