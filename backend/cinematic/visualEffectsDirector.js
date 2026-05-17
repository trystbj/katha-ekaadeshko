/**
 * Cinematic VFX layer — extends environment reaction.
 */

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {string} styleId
 * @param {object} environment from inferEnvironmentReaction
 */
export function inferVisualEffects(ctx, styleId, environment) {
  const env = environment || {}
  let rain = env.rain ?? 0
  let snow = 0
  let fog = env.fog ?? 0
  let magicalGlow = 0
  let speedLines = 0
  let impactFlash = 0
  let dust = 0
  let lightRays = 0
  let embers = 0

  if (ctx.weather?.snow > 0.3) snow = ctx.weather.snow
  if (ctx.emotion === 'wonder' || ctx.emotion === 'peace') {
    magicalGlow = styleId.includes('anime') || styleId === 'soft_anime_fantasy' ? 0.45 : 0.2
    lightRays = 0.35
  }
  if (ctx.actionLevel > 0.65) {
    speedLines = styleId === 'comic_panel' || styleId.includes('anime') ? 0.7 : 0.35
    impactFlash = ctx.actionLevel > 0.8 ? 0.5 : 0.25
    dust = 0.4
  }
  if (ctx.emotion === 'fear') {
    fog = Math.max(fog, 0.5)
  }
  if (env.particles > 0.3) embers = env.particles * 0.6

  if (styleId === 'dark_anime') {
    fog = Math.max(fog, 0.35)
    magicalGlow *= 0.5
  }
  if (styleId === 'comic_panel' && ctx.actionLevel > 0.4) {
    speedLines = Math.max(speedLines, 0.55)
    impactFlash = Math.max(impactFlash, 0.4)
  }

  const intensity = Math.min(
    1,
    (rain + snow + fog + magicalGlow + speedLines + impactFlash) / 3
  )

  return {
    rain,
    snow,
    fog,
    magicalGlow,
    speedLines,
    impactFlash,
    dust,
    lightRays,
    embers,
    intensity
  }
}
