/**
 * Unified production memory — character, story, visual, and animation layers.
 */

import { buildStoryMemorySnapshot } from '../../cinematic/storyMemoryContinuity.js'
import { buildAnimationIntegrationRegistry } from '../../cinematic/premium/animationIntegrationRegistry.js'

/**
 * @param {object} params
 */
export function buildProductionMemory(params = {}) {
  const {
    story = null,
    script = [],
    directives = {},
    agentCouncil = null,
    continuityPack = null,
    priorMemorySummary = '',
    enrichedScenes = []
  } = params

  const storyMemory = buildStoryMemorySnapshot(story, script, priorMemorySummary)

  const characterMemory = (Array.isArray(story?.characters) ? story.characters : []).map((c) => ({
    name: String(c.name || '').trim(),
    personality: String(c.personality || c.role || '').trim(),
    visualIdentity: String(c.visualIdentity || c.appearance || '').trim(),
    speakingStyle: directives.dialogueStyle || 'natural',
    relationships: [],
    outfitConsistency: true,
    faceConsistency: true
  }))

  const visualMemory = {
    lightingStyle: directives.lightingStyle || '',
    colorPalette: directives.visualStyle || '',
    cameraLanguage: directives.cameraStyle || '',
    environmentConsistency: continuityPack?.world?.location || ''
  }

  const animationRegistry = buildAnimationIntegrationRegistry(
    enrichedScenes.length ? enrichedScenes : script.map((r, i) => ({ sceneIndex: i + 1 })),
    story
  )

  const animationMemory = {
    motionIntensity: directives.motionIntensity || 'medium',
    transitionPacing: directives.pacing || 'balanced',
    cinematicBehavior: directives.animationStyle || '',
    subtitleMotionStyle: agentCouncil?.agents?.animationDirector?.subtitleMotion || 'readable',
    registry: animationRegistry
  }

  return {
    version: 2,
    characterMemory,
    storyMemory,
    visualMemory,
    animationMemory,
    updatedAt: new Date().toISOString()
  }
}
