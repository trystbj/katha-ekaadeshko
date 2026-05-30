/**
 * Cinematic camera/motion preset per scene (maps to VideoMotionPreset).
 */

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {string} styleId
 * @param {string} [phase]
 */
export function inferSceneMotion(ctx, styleId, phase) {
  const sid = String(styleId || '').trim()

  if (ctx.actionLevel > 0.75) {
    return { preset: sid === 'comic_panel' ? 'shake_dramatic' : 'handheld_micro' }
  }
  if (ctx.emotion === 'fear' || ctx.suspenseLevel > 0.7) {
    return { preset: 'tilt_dramatic' }
  }
  if (ctx.emotion === 'surprise' || phase === 'reveal') {
    return { preset: 'cinematic_push' }
  }
  if (ctx.emotion === 'wonder' || sid === 'soft_anime_fantasy') {
    return { preset: 'parallax_float' }
  }
  if (ctx.emotion === 'sadness') {
    return { preset: 'slow_zoom_in' }
  }
  if (ctx.emotion === 'joy' && sid === 'comic_panel') {
    return { preset: 'orbit_soft' }
  }
  if (phase === 'climax') {
    return { preset: 'shake_dramatic' }
  }
  if (phase === 'intro' || phase === 'ending') {
    return { preset: 'pull_out' }
  }
  if (sid === 'cinematic_anime' || sid === 'cinematic_realistic') {
    return { preset: 'cinematic_push' }
  }
  if (sid === 'cozy_storybook') {
    return { preset: 'smooth_pan' }
  }
  return { preset: 'ai_auto_motion' }
}
