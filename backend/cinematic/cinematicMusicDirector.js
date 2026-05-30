/**
 * Intelligent soundtrack theme + transition per scene (catalog-aligned tags).
 */

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {string} [phase]
 * @param {string} styleId
 */
export function inferSceneMusic(ctx, phase, styleId) {
  let theme = 'neutral'
  let transition = 'hold'
  let intensity = 0.45
  let silenceBeforeMs = 0

  if (phase === 'intro') {
    theme = 'peaceful'
    transition = 'fade_in'
    intensity = 0.32
  } else if (phase === 'climax') {
    theme = 'climax'
    transition = 'swell'
    intensity = 0.92
  } else if (phase === 'ending') {
    theme = 'emotional_piano'
    transition = 'fade_out'
    intensity = 0.38
  } else if (ctx.emotion === 'fear' || /horror/.test(String(ctx.blob))) {
    theme = 'horror_drone'
    intensity = 0.55
    if (ctx.suspenseLevel > 0.7) silenceBeforeMs = 180
  } else if (ctx.emotion === 'suspense' || phase === 'reveal') {
    theme = 'mystery'
    transition = ctx.emotion === 'surprise' ? 'cut' : 'hold'
    intensity = 0.62
    if (phase === 'reveal') silenceBeforeMs = 220
  } else if (ctx.actionLevel > 0.7) {
    theme = 'battle'
    transition = 'swell'
    intensity = 0.88
  } else if (ctx.emotion === 'sadness' || phase === 'emotional') {
    theme = 'emotional_piano'
    intensity = 0.42
    transition = 'fade_in'
  } else if (ctx.emotion === 'wonder' || ctx.emotion === 'peace') {
    theme = 'fantasy_ambient'
    intensity = 0.4
  }

  const sid = String(styleId || '')
  if (sid === 'cinematic_realistic' && theme === 'neutral') theme = 'emotional_piano'
  if (sid === 'cozy_storybook') theme = theme === 'battle' ? theme : 'peaceful'
  if (sid === 'cinematic_anime' && phase === 'reveal') {
    theme = 'climax'
    transition = 'swell'
  }

  return { theme, transition, intensity: Math.min(1, intensity), silenceBeforeMs }
}
