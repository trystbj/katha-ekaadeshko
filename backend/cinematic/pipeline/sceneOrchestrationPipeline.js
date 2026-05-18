/**
 * Unified AI cinematic generation pipeline — orchestrates all engines through scene units.
 *
 * Flow:
 * Story/script → Evolution director (v4) → Scene breakdown → Emotion → Narration plan
 * → Transitions → Master timeline v2 → Render assembly → enriched director plan
 */

import { buildEvolutionCinematicPlan } from '../evolutionOrchestrator.js'
import { buildSceneBreakdown } from './sceneBreakdownEngine.js'
import { buildEmotionProfiles } from './emotionAnalysisEngine.js'
import { buildNarrationOrchestrationPlan } from './narrationPlanningEngine.js'
import { buildSceneTransitions } from './transitionDirector.js'
import {
  applySynchronizedTimelineToScenes,
  buildSynchronizedMasterTimeline
} from './synchronizedMasterTimeline.js'
import { buildRenderAssemblyPlan } from './renderAssemblyEngine.js'

/** Blend pre-script scene outline hints into post-script breakdown units. */
function mergeLongStorySceneHints(sceneUnits, longPlan) {
  if (!longPlan?.active || !Array.isArray(sceneUnits) || !sceneUnits.length) return sceneUnits
  const outline = longPlan.sceneOutline || []
  return sceneUnits.map((unit, i) => {
    const hint = outline[i] || outline[outline.length - 1]
    if (!hint) return unit
    return {
      ...unit,
      beatType: unit.beatType || hint.beatType,
      emotionalIntensity: Math.min(
        1,
        Math.max(unit.emotionalIntensity || 0.4, hint.beatType === 'emotional' ? 0.75 : 0.5)
      ),
      longStoryHint: {
        continuityNote: hint.continuityNote,
        emotionalTone: hint.emotionalTone,
        dialogueHeavy: hint.dialogueHeavy
      }
    }
  })
}

export const PIPELINE_STAGES = [
  'story_analysis',
  'scene_breakdown',
  'emotion_analysis',
  'cinematic_director_v4',
  'narration_planning',
  'camera_acting_expression',
  'ambience_music',
  'transition_planning',
  'timeline_synchronization',
  'render_assembly'
]

/**
 * Full scene-orchestrated cinematic pipeline (wraps evolution + sync layer).
 * @param {object} params same as buildEvolutionCinematicPlan
 */
export function buildSceneOrchestratedPlan(params) {
  const { script, input, story, storyAudioPlan } = params
  const evolution = buildEvolutionCinematicPlan(params)
  const plan = evolution.cinematicDirectorPlan

  if (!plan || plan.autoDirected === false) {
    return {
      ...evolution,
      sceneOrchestration: null
    }
  }

  let sceneUnits = buildSceneBreakdown(script, story, input)
  sceneUnits = mergeLongStorySceneHints(sceneUnits, input?.longStoryIntelligence)
  const emotionProfiles = buildEmotionProfiles(sceneUnits, script, input)
  const narrationPlans = buildNarrationOrchestrationPlan(sceneUnits, script, input)

  const enrichedScenes = [...(plan.scenes || [])]
  const transitions = buildSceneTransitions(enrichedScenes, sceneUnits, plan.directorPersonality)

  const secondsPerScene = evolution.storyAudioPlan?.secondsPerScene ?? storyAudioPlan?.secondsPerScene ?? 4
  const masterTimeline = buildSynchronizedMasterTimeline(enrichedScenes, transitions, secondsPerScene)
  applySynchronizedTimelineToScenes(enrichedScenes, masterTimeline)

  const renderAssembly = buildRenderAssemblyPlan({
    cinematicDirectorPlan: { ...plan, scenes: enrichedScenes },
    script,
    storyAudioPlan: evolution.storyAudioPlan,
    sceneUnits,
    masterTimeline,
    transitions
  })

  const sceneOrchestration = {
    version: 1,
    pipelineStages: PIPELINE_STAGES,
    sceneUnits,
    emotionProfiles,
    narrationPlans,
    transitions,
    masterTimeline,
    renderAssembly
  }

  const cinematicDirectorPlan = {
    ...plan,
    scenes: enrichedScenes,
    masterTimeline: {
      syncVersion: 2,
      secondsPerScene: masterTimeline.secondsPerScene,
      sceneCount: masterTimeline.sceneCount,
      totalDurationMs: masterTimeline.totalDurationMs
    },
    orchestration: sceneOrchestration
  }

  return {
    ...evolution,
    cinematicDirectorPlan,
    sceneOrchestration,
    renderAssemblyPlan: renderAssembly
  }
}
