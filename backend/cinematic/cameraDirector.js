/**
 * AI Cinematic Camera Director — shot type, movement emphasis, focus shifts.
 */

import { inferSceneMotion } from './motionDirector.js'

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {string} styleId
 * @param {string} [phase]
 */
export function inferCameraDirector(ctx, styleId, phase) {
  const motion = inferSceneMotion(ctx, styleId, phase)
  let shotType = 'medium'
  let focusShift = 'none'
  let parallaxDepth = 0.25
  let breathing = 0.15
  let shakeIntensity = 0
  let emphasis = 'static'

  if (ctx.emotion === 'sadness' || ctx.emotion === 'tender') {
    shotType = 'closeup'
    focusShift = 'character'
    breathing = 0.35
    emphasis = 'push'
  }
  if (ctx.emotion === 'fear' || ctx.suspenseLevel > 0.7) {
    shotType = 'closeup'
    focusShift = 'character'
    breathing = 0.25
    shakeIntensity = 0.2
    emphasis = 'pan'
  }
  if (ctx.emotion === 'wonder' || ctx.emotion === 'peace') {
    shotType = 'wide'
    focusShift = 'environment'
    parallaxDepth = 0.55
    emphasis = 'orbit'
  }
  if (ctx.actionLevel > 0.75) {
    shotType = 'impact'
    shakeIntensity = 0.65
    emphasis = 'impact'
    focusShift = 'dual'
  }
  if (phase === 'reveal' || ctx.emotion === 'surprise') {
    shotType = 'extreme_closeup'
    focusShift = 'reveal'
    emphasis = 'push'
    parallaxDepth = 0.4
  }
  if (phase === 'climax') {
    shotType = 'impact'
    shakeIntensity = 0.5
    emphasis = 'impact'
  }
  if (phase === 'intro' || phase === 'ending') {
    shotType = 'wide'
    focusShift = 'environment'
    emphasis = 'pull'
    parallaxDepth = 0.45
  }

  const sid = String(styleId || '')
  if (sid === 'comic_panel' && ctx.actionLevel > 0.4) {
    shotType = 'impact'
    shakeIntensity = Math.max(shakeIntensity, 0.45)
  }
  if (sid === 'cinematic_anime' && ctx.emotion === 'sadness') {
    shotType = 'closeup'
    breathing = 0.4
  }

  return {
    shotType,
    focusShift,
    parallaxDepth: Math.min(1, parallaxDepth),
    breathing: Math.min(1, breathing),
    shakeIntensity: Math.min(1, shakeIntensity),
    emphasis,
    preset: motion.preset
  }
}
