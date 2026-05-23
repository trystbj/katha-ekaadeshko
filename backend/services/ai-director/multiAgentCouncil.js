/**
 * Multi-agent director council — internal role separation (no UI).
 * Leonardo remains the render engine; this council sets creative policy.
 */

import { applyAiDirectorBrain, buildStoryArcPlan } from '../../cinematic/aiDirectorBrain.js'
import { buildContinuityState } from '../../cinematic/continuityTracker.js'

/**
 * @param {object} params
 * @param {object} params.input
 * @param {object} params.directives normalized production directives
 */
export function runMultiAgentCouncil({ input = {}, directives = {} }) {
  const d = directives
  const seed = String(input.seedLine || input.theme || '')

  const storyDirector = {
    role: 'story_director',
    plotFocus: d.emotion || 'dramatic_arc',
    pacingPolicy: d.pacing || 'balanced_episodic',
    sceneRhythm: d.pacing === 'snappy_shortform' ? 'short_beats' : 'cinematic_beats',
    cliffhangerBias: /\b(thriller|mystery|suspense)\b/i.test(seed) ? 'high' : 'medium'
  }

  const dialogueDirector = {
    role: 'dialogue_director',
    style: d.dialogueStyle || 'natural_culturally_grounded',
    emotionalRealism: 'high',
    culturalSpeech: String(input.country || input.storyLanguage || 'en'),
    subtextLevel: d.emotion?.includes('intimate') ? 'high' : 'medium'
  }

  const cinematicDirector = {
    role: 'cinematic_director',
    cameraLanguage: d.cameraStyle || 'motivated_medium_coverage',
    lighting: d.lightingStyle || 'motivated_cinematic',
    transitionIntensity: d.generationMode === 'fast' ? 'cut_heavy' : 'motivated_dissolve',
    atmosphere: d.sceneMood || d.emotion || 'neutral'
  }

  const characterDirector = {
    role: 'character_director',
    personalityContinuity: 'strict',
    relationshipDynamics: 'track_across_scenes',
    expressionPolicy: d.generationMode === 'cinematic' ? 'micro_expression_rich' : 'readable_clear'
  }

  const animationDirector = {
    role: 'animation_director',
    motionPreset: d.animationStyle || 'cinematic_motion_emotive',
    motionIntensity: d.motionIntensity || 'medium',
    lipSyncPriority: d.generationMode === 'cinematic' ? 'high' : 'medium',
    subtitleMotion: d.generationMode === 'cinematic' ? 'emotive_kinetic' : 'readable_static',
    platformFormat: d.targetPlatform || 'mobile_vertical_story'
  }

  return {
    version: 1,
    master: 'ai_director_system',
    renderEngine: 'leonardo',
    agents: {
      storyDirector,
      dialogueDirector,
      cinematicDirector,
      characterDirector,
      animationDirector
    },
    policy: {
      manualReviewGates: ['script_review', 'asset_review', 'video_review'],
      leonardoScope: 'render_only'
    }
  }
}

/**
 * Post-script enrichment using director brain + continuity.
 * @param {object} params
 */
export function applyCouncilToScriptPlan(params = {}) {
  const { script = [], directives = {}, story = null, priorWorld = null } = params
  const continuity = buildContinuityState(script, priorWorld)
  const sceneUnits = script.map((row, i) => ({
    beatType: 'general',
    emotionalIntensity: 0.45,
    narration: row?.narration,
    visual_description: row?.visual_description
  }))
  const arcPlan = buildStoryArcPlan(sceneUnits, script.length)
  const enrichedScenes = sceneUnits.map((u, i) => ({
    sceneIndex: i + 1,
    emotion: { primary: directives.emotion || 'neutral' },
    ...u
  }))
  const brain = applyAiDirectorBrain({
    enrichedScenes,
    sceneUnits,
    script,
    input: { genre: directives.genre, storyTone: directives.emotion },
    storyArc: arcPlan
  })

  return { continuity, arcPlan, directorBrain: brain }
}
