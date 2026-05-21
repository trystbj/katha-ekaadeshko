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
import { applyAiDirectorBrain, buildStoryArcPlan } from '../aiDirectorBrain.js'
import { applyPremiumStudioLayer } from '../premium/applyPremiumStudioLayer.js'

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
  const storyArc = buildStoryArcPlan(sceneUnits, script.length)

  const enrichedScenes = [...(plan.scenes || [])]
  const directorBrain = applyAiDirectorBrain({
    enrichedScenes,
    emotionProfiles,
    sceneUnits,
    script,
    input,
    storyArc
  })

  const premium = applyPremiumStudioLayer({
    enrichedScenes,
    emotionProfiles,
    sceneUnits,
    script,
    input,
    story,
    storyArc,
    directorBrain,
    storyAudioPlan: evolution.storyAudioPlan ?? storyAudioPlan,
    storyMemorySnapshot: evolution.storyMemorySnapshot,
    relationshipSnapshot: evolution.relationshipSnapshot,
    trailerRecap: plan.trailerRecap,
    directorPersonality: plan.directorPersonality,
    voiceCast: plan.multiCharacterVoices,
    projectId: input?.projectId
  })

  const finalScenes = premium.scenes
  const transitions = premium.transitions
  const masterTimeline = premium.masterTimeline

  const renderAssembly = buildRenderAssemblyPlan({
    cinematicDirectorPlan: { ...plan, scenes: finalScenes },
    script,
    storyAudioPlan: premium.storyAudioPlan,
    sceneUnits,
    masterTimeline,
    transitions
  })

  console.info('[katha:studio]', 'ai_director_brain', {
    scenes: finalScenes.length,
    climax: directorBrain.storyArc?.climaxIndex
  })

  const sceneOrchestration = {
    version: 3,
    pipelineStages: [...PIPELINE_STAGES, 'ai_director_brain', 'premium_studio_layer'],
    sceneUnits,
    emotionProfiles,
    narrationPlans,
    storyArc: directorBrain.storyArc,
    aiDirector: directorBrain,
    premiumStudio: {
      bookends: premium.bookends,
      attentionPlan: premium.attentionPlan,
      subtitleCinematic: premium.subtitleCinematic,
      shortForm: premium.shortForm,
      animationRegistry: premium.animationRegistry,
      performance: premium.performance,
      qualityReport: premium.qualityReport
    },
    transitions,
    masterTimeline,
    renderAssembly
  }

  const cinematicDirectorPlan = {
    ...plan,
    scenes: finalScenes,
    cinematicBookends: premium.bookends,
    shortForm: premium.shortForm,
    subtitleCinematic: premium.subtitleCinematic,
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
    storyMemorySnapshot: premium.emotionalMemory ?? evolution.storyMemorySnapshot,
    storyAudioPlan: premium.storyAudioPlan ?? evolution.storyAudioPlan,
    sceneOrchestration,
    renderAssemblyPlan: renderAssembly,
    qualityReport: premium.qualityReport
  }
}
