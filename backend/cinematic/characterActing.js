/**
 * Full character acting cues (posture, gesture, idle) beyond facial expression.
 */

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {object} expression from inferCharacterExpression
 * @param {string} styleId
 */
export function inferCharacterActing(ctx, expression, styleId) {
  const sid = String(styleId || '').trim()
  let idleMotion = 'subtle'
  let posture = 'neutral'
  let headTilt = 0
  let gestureIntensity = 0.4
  let reactionDelayMs = 120
  let stillnessMoment = false

  if (ctx.emotion === 'fear' || ctx.suspenseLevel > 0.65) {
    idleMotion = 'nervous'
    posture = 'defensive'
    headTilt = -4
    gestureIntensity = 0.35
    reactionDelayMs = 200
  }
  if (ctx.emotion === 'sadness') {
    idleMotion = 'subtle'
    posture = 'slumped'
    headTilt = 6
    gestureIntensity = 0.25
    reactionDelayMs = 280
    stillnessMoment = true
  }
  if (ctx.emotion === 'joy' || ctx.actionLevel > 0.5) {
    idleMotion = 'energetic'
    posture = 'upright'
    gestureIntensity = 0.75
    reactionDelayMs = 80
  }
  if (ctx.emotion === 'anger') {
    posture = 'tense'
    gestureIntensity = 0.7
    headTilt = -2
  }
  if (ctx.emotion === 'surprise') {
    gestureIntensity = 0.85
    reactionDelayMs = 60
    headTilt = -8
  }
  if (ctx.actionLevel > 0.8) {
    idleMotion = 'energetic'
    posture = 'tense'
  }

  if (sid === 'cozy_storybook') {
    gestureIntensity *= 0.85
    stillnessMoment = ctx.emotion === 'peace'
  }
  if (sid === 'comic_panel') {
    gestureIntensity = Math.min(1, gestureIntensity * 1.25)
    idleMotion = ctx.actionLevel > 0.3 ? 'energetic' : idleMotion
  }
  if (sid === 'dark_anime' && ctx.tension > 0.5) {
    stillnessMoment = ctx.suspenseLevel > 0.6
    reactionDelayMs += 80
  }

  return {
    idleMotion,
    posture,
    headTilt,
    gestureIntensity: Math.min(1, Math.max(0.1, gestureIntensity)),
    reactionDelayMs,
    stillnessMoment
  }
}
