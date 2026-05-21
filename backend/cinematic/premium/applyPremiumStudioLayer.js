/**
 * Premium studio layer — orchestrates next-gen cinematic systems on enriched scenes.
 */

import { buildCinematicBookends } from './cinematicBookends.js'
import { buildAttentionPacingPlan, applyAttentionPacingToScenes } from './attentionPacingEngine.js'
import { applyColorGradingToScenes } from './colorGradingDirector.js'
import { applyEnvironmentalLifeToScenes } from './environmentalLifeEngine.js'
import { applyExpressionAndLightingToScenes } from './expressionLightingDirector.js'
import { applyDialogueStagingToScenes } from './dialogueStagingDirector.js'
import { enrichEmotionalMemory } from './emotionalMemoryEngine.js'
import { buildSubtitleCinematicPlan } from './subtitleCinematicEngine.js'
import { buildShortFormPlan } from './shortFormContentEngine.js'
import { enrichAdvancedAudioPlan } from './advancedAudioEngine.js'
import { buildSmartTransitions } from './smartTransitionsEngine.js'
import { analyzeStoryQualityStudio } from './storyQualityStudio.js'
import { buildPerformancePlan } from './performanceStudio.js'
import { buildAnimationIntegrationRegistry } from './animationIntegrationRegistry.js'
import {
  applySynchronizedTimelineToScenes,
  buildSynchronizedMasterTimeline
} from '../pipeline/synchronizedMasterTimeline.js'

/**
 * @param {object} params
 */
export function applyPremiumStudioLayer(params) {
  const {
    enrichedScenes: initialScenes,
    emotionProfiles = [],
    sceneUnits = [],
    script = [],
    input = {},
    story = {},
    storyArc = {},
    directorBrain = {},
    storyAudioPlan = null,
    storyMemorySnapshot = null,
    relationshipSnapshot = [],
    trailerRecap = null,
    directorPersonality = null,
    projectId = ''
  } = params

  let scenes = [...initialScenes]

  const attentionPlan = buildAttentionPacingPlan(sceneUnits, emotionProfiles, script, input)
  scenes = applyAttentionPacingToScenes(scenes, attentionPlan)
  scenes = applyColorGradingToScenes(scenes, emotionProfiles, input)
  scenes = applyEnvironmentalLifeToScenes(scenes, script, input)
  scenes = applyExpressionAndLightingToScenes(scenes, emotionProfiles, script, input)
  scenes = applyDialogueStagingToScenes(scenes, script)

  const transitions = buildSmartTransitions(scenes, sceneUnits, emotionProfiles, directorPersonality)
  const secondsPerScene =
    storyAudioPlan?.secondsPerScene ??
    (scenes[0]?.durationMs ? scenes[0].durationMs / 1000 : 4)
  const masterTimeline = buildSynchronizedMasterTimeline(scenes, transitions, secondsPerScene)
  applySynchronizedTimelineToScenes(scenes, masterTimeline)

  const bookends = buildCinematicBookends({ story, input, storyArc, emotionProfiles })
  const subtitleCinematic = buildSubtitleCinematicPlan(scenes, script, emotionProfiles)
  const shortForm = buildShortFormPlan({
    enrichedScenes: scenes,
    emotionProfiles,
    script,
    attentionPlan,
    storyArc: directorBrain.storyArc || storyArc,
    trailerRecap
  })
  const emotionalMemory = enrichEmotionalMemory(
    storyMemorySnapshot,
    emotionProfiles,
    script,
    relationshipSnapshot
  )
  const audioPlan = enrichAdvancedAudioPlan(storyAudioPlan, scenes)
  const animationRegistry = buildAnimationIntegrationRegistry(
    scenes,
    story,
    params.voiceCast || []
  )
  const performance = buildPerformancePlan({
    sceneCount: scenes.length,
    assetCount: scenes.length,
    projectId
  })

  const qualityReport = analyzeStoryQualityStudio({
    cinematicDirectorPlan: { scenes, orchestration: { sceneUnits, emotionProfiles, transitions } },
    script,
    continuity: emotionalMemory?.continuity
  })

  console.info('[katha:premium]', 'studio_layer_applied', {
    scenes: scenes.length,
    renderReady: qualityReport.renderReady,
    hooks: shortForm.hooks?.length
  })

  return {
    scenes,
    transitions,
    masterTimeline,
    bookends,
    attentionPlan,
    subtitleCinematic,
    shortForm,
    emotionalMemory,
    storyAudioPlan: audioPlan,
    animationRegistry,
    performance,
    qualityReport,
    premiumVersion: 1
  }
}
