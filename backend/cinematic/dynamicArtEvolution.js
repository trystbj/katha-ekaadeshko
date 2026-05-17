/**
 * Dynamic art evolution — color grading and atmosphere progression across episode.
 */

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {number} sceneIndex
 * @param {number} sceneCount
 * @param {object} [world]
 * @param {object} [symbolism]
 */
export function inferArtEvolutionCue(ctx, sceneIndex, sceneCount, world, symbolism) {
  const progress = sceneCount > 1 ? sceneIndex / (sceneCount - 1) : 0
  let progressionPhase = 'rising'
  if (progress < 0.12) progressionPhase = 'opening'
  else if (progress > 0.88) progressionPhase = 'resolution'
  else if (progress > 0.65 && ctx.tension > 0.6) progressionPhase = 'climax'
  else if (world?.warActive || ctx.tension > 0.75) progressionPhase = 'darkening'
  else if (ctx.emotion === 'peace' || symbolism?.themes?.includes('hope')) progressionPhase = 'healing'

  let warmth = 0.52
  let contrast = 0.5
  let saturation = 0.55
  let atmosphereDensity = 0.4
  let shadowDepth = 0.35

  if (progressionPhase === 'opening') {
    warmth = 0.62
    saturation = 0.58
    atmosphereDensity = 0.32
  }
  if (progressionPhase === 'darkening') {
    warmth = 0.38
    contrast = 0.72
    shadowDepth = 0.65
    atmosphereDensity = 0.62
  }
  if (progressionPhase === 'healing') {
    warmth = 0.68
    saturation = 0.6
    shadowDepth = 0.28
  }
  if (progressionPhase === 'climax') {
    contrast = 0.78
    saturation = 0.65
    atmosphereDensity = 0.55
  }
  if (world?.magicalCorruption > 0.4) {
    warmth -= 0.1
    shadowDepth += 0.15
    saturation -= 0.08
  }
  if (symbolism?.colorTone === 'cool') warmth -= 0.08
  if (symbolism?.colorTone === 'warm') warmth += 0.1

  return {
    warmth: Math.min(1, Math.max(0, warmth)),
    contrast: Math.min(1, Math.max(0, contrast)),
    saturation: Math.min(1, Math.max(0, saturation)),
    atmosphereDensity: Math.min(1, Math.max(0, atmosphereDensity)),
    shadowDepth: Math.min(1, Math.max(0, shadowDepth)),
    progressionPhase
  }
}
