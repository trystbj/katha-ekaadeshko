/**
 * AI character expression cues from scene context + style preset.
 */

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {string} styleId
 */
export function inferCharacterExpression(ctx, styleId) {
  const sid = String(styleId || '').trim()
  const isComic = sid === 'comic_panel'
  const isAnime = sid === 'cinematic_anime' || sid === 'soft_anime_fantasy'
  const isRealistic = sid === 'cinematic_realistic'

  let mood = 'neutral'
  let intensity = 0.45
  let blinkRate = 'normal'
  let eyeMotion = 'steady'
  let breathVisible = false
  let exaggeration = 'subtle'

  switch (ctx.emotion) {
    case 'joy':
      mood = 'smile'
      intensity = 0.72
      blinkRate = 'normal'
      break
    case 'sadness':
      mood = 'sad'
      intensity = 0.68
      eyeMotion = 'watery'
      blinkRate = 'slow'
      breathVisible = true
      break
    case 'fear':
      mood = 'fear'
      intensity = 0.78
      eyeMotion = 'dart'
      blinkRate = 'fast'
      break
    case 'anger':
      mood = 'anger'
      intensity = 0.75
      break
    case 'surprise':
      mood = isAnime ? 'anime_shock' : 'surprise'
      intensity = 0.8
      blinkRate = 'fast'
      break
    case 'suspense':
    case 'tension':
      mood = 'determined'
      intensity = 0.55
      eyeMotion = 'dart'
      break
    case 'wonder':
      mood = 'smile'
      intensity = 0.6
      eyeMotion = 'steady'
      break
    case 'peace':
      mood = 'neutral'
      intensity = 0.35
      blinkRate = 'slow'
      break
    default:
      break
  }

  if (ctx.actionLevel > 0.7) {
    mood = mood === 'neutral' ? 'determined' : mood
    intensity = Math.max(intensity, 0.7)
    breathVisible = true
  }

  if (isComic) {
    exaggeration = 'high'
    if (ctx.emotion === 'surprise' || ctx.emotion === 'joy') mood = 'comic_wide'
  } else if (isAnime) {
    exaggeration = ctx.emotion === 'surprise' || ctx.emotion === 'fear' ? 'high' : 'normal'
  } else if (isRealistic) {
    exaggeration = 'subtle'
    breathVisible = breathVisible || ctx.emotion === 'sadness' || ctx.emotion === 'fear' || ctx.emotion === 'joy'
    blinkRate = blinkRate === 'fast' ? 'normal' : blinkRate
    eyeMotion = ctx.emotion === 'fear' ? 'dart' : 'steady'
  } else if (sid === 'cozy_storybook') {
    exaggeration = 'subtle'
    intensity *= 0.9
  }

  return {
    mood,
    intensity: Math.min(1, Math.max(0.15, intensity)),
    blinkRate,
    eyeMotion,
    breathVisible,
    exaggeration
  }
}
