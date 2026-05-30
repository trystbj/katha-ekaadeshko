/**
 * Scene ambience tags for beds/SFX layering (catalog-aligned).
 */

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {string} styleId
 */
export function inferAmbienceCue(ctx, styleId) {
  const tags = []
  const sid = String(styleId || '').trim()

  if (ctx.location === 'forest') tags.push('forest', 'birds')
  if (ctx.location === 'city') tags.push('city', 'crowd')
  if (ctx.location === 'cave') tags.push('cave_echo')
  if (ctx.location === 'village') tags.push('village')
  if (ctx.location === 'temple') tags.push('bell')
  if (ctx.location === 'mountain') tags.push('wind')

  if (ctx.weather.rain > 0.3) tags.push('rain')
  if (ctx.weather.wind > 0.3) tags.push('wind')
  if (ctx.weather.thunder > 0.3) tags.push('thunder')

  if (ctx.emotion === 'fear' || ctx.suspenseLevel > 0.65) tags.push('heartbeat', 'whisper')
  if (ctx.emotion === 'peace') tags.push('birds')
  if (ctx.actionLevel > 0.6) tags.push('footsteps')

  if (sid === 'cozy_storybook') tags.push('birds', 'wind')
  if (sid === 'cinematic_realistic') tags.push('room_tone', 'wind_soft')
  if (sid === 'cinematic_anime' && ctx.emotion === 'wonder') tags.push('magic')

  const unique = [...new Set(tags)]
  let intensity = 0.4 + ctx.tension * 0.35
  if (ctx.emotion === 'peace') intensity = 0.32
  if (ctx.actionLevel > 0.7) intensity = 0.62

  return { tags: unique.slice(0, 6), intensity: Math.min(1, intensity) }
}
