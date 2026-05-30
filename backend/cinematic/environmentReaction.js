/**
 * Environment reaction cues — lighting, weather layers, motion intensity (renderer/worker hints).
 */

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {string} styleId
 * @param {string} [storyTone]
 */
export function inferEnvironmentReaction(ctx, styleId, storyTone) {
  const sid = String(styleId || '').trim()
  const tone = String(storyTone || '').toLowerCase()

  let lightingMood = 'neutral'
  let fog = ctx.weather.fog
  let rain = ctx.weather.rain
  let wind = ctx.weather.wind
  let particles = 0
  let shake = 0
  let warmth = 0.5

  if (ctx.timeOfDay === 'night') lightingMood = 'dim'
  if (ctx.timeOfDay === 'evening') {
    lightingMood = 'neutral'
    warmth = 0.65
  }
  if (ctx.timeOfDay === 'morning') warmth = 0.58

  if (ctx.emotion === 'fear' || ctx.emotion === 'suspense') {
    lightingMood = 'dark'
    fog = Math.max(fog, 0.45)
    shake = ctx.actionLevel > 0.5 ? 0.35 : 0.15
  }
  if (ctx.emotion === 'sadness') {
    rain = Math.max(rain, 0.35)
    wind = Math.max(wind, 0.2)
    lightingMood = 'dim'
  }
  if (ctx.emotion === 'joy' || ctx.emotion === 'peace') {
    lightingMood = 'bright'
    warmth = 0.72
    particles = sid.includes('anime') || sid === 'soft_anime_fantasy' ? 0.25 : 0.1
  }
  if (ctx.emotion === 'wonder') {
    lightingMood = 'mystic'
    particles = 0.55
    warmth = 0.6
  }

  if (sid === 'cinematic_realistic') {
    lightingMood = ctx.emotion === 'fear' || ctx.emotion === 'sadness' ? 'low_key' : 'natural'
    fog = Math.min(fog, 0.2)
    warmth = Math.min(0.72, warmth + 0.05)
  }
  if (sid === 'cozy_storybook') {
    warmth = 0.78
    lightingMood = ctx.emotion === 'fear' ? 'dim' : 'bright'
  }
  if (tone === 'noir') {
    lightingMood = 'dark'
    fog = Math.max(fog, 0.3)
  }

  let filterHint = 'none'
  if (lightingMood === 'dark') filterHint = 'moody'
  else if (lightingMood === 'mystic') filterHint = 'mystical_glow'
  else if (warmth > 0.7) filterHint = 'warm'
  else if (sid === 'cinematic_anime' || sid === 'cinematic_realistic') filterHint = 'cinematic'

  if (ctx.actionLevel > 0.75) shake = Math.max(shake, 0.4)

  return {
    lightingMood,
    fog: Math.min(1, fog),
    rain: Math.min(1, rain),
    wind: Math.min(1, wind),
    particles: Math.min(1, particles),
    shake: Math.min(1, shake),
    warmth: Math.min(1, warmth),
    filterHint
  }
}
