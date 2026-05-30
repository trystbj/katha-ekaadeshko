/**
 * Per-scene emotional audio mix — adjusts segment intensity and plan-level gains (worker-safe).
 */

/**
 * @param {object} segment
 * @param {object} ctx scene context from analyzeSceneContext
 * @param {object} expression
 * @param {string} styleId
 */
export function mixSegmentAudio(segment, ctx, expression, styleId) {
  const sid = String(styleId || '').trim()
  let intensity = typeof segment.intensity === 'number' ? segment.intensity : 0.45

  if (ctx.emotion === 'fear' || ctx.emotion === 'suspense') {
    intensity = Math.max(0.2, intensity * 0.72)
  } else if (ctx.emotion === 'sadness') {
    intensity = Math.max(0.18, intensity * 0.78)
  } else if (ctx.actionLevel > 0.7) {
    intensity = Math.min(0.98, intensity * 1.18)
  } else if (ctx.emotion === 'joy' || ctx.emotion === 'peace') {
    intensity = Math.min(0.55, intensity * 0.92)
  }

  if (sid === 'cozy_storybook') intensity *= 0.88
  if (sid === 'cinematic_realistic' && ctx.suspenseLevel > 0.5) intensity = Math.max(0.28, intensity * 0.88)
  if (sid === 'comic_panel' && ctx.actionLevel > 0.4) intensity = Math.min(0.75, intensity * 1.05)

  const musicGainMul =
    ctx.emotion === 'suspense' || ctx.emotion === 'fear'
      ? 0.82
      : ctx.emotion === 'sadness'
        ? 0.88
        : ctx.actionLevel > 0.7
          ? 1.08
          : 1

  const sfxGainMul = ctx.actionLevel > 0.5 ? 1.15 : ctx.suspenseLevel > 0.6 ? 1.05 : 1
  const narratorGainMul = ctx.emotion === 'fear' ? 1.04 : 1
  const silencePadMs =
    ctx.emotion === 'suspense' || ctx.emotion === 'surprise' ? Math.round(180 + ctx.suspenseLevel * 220) : 0

  return {
    ...segment,
    intensity: Math.min(0.98, Math.max(0.12, intensity)),
    musicGainMul,
    sfxGainMul,
    narratorGainMul,
    silencePadMs
  }
}

/**
 * Apply scene-level mix to full storyAudioPlan (additive fields only).
 * @param {object} plan
 * @param {Array<object>} scenePlans
 */
export function applyEmotionalMixToAudioPlan(plan, scenePlans) {
  if (!plan || !Array.isArray(plan.segments)) return plan
  const segments = plan.segments.map((seg, i) => {
    const sp = scenePlans[i]
    if (!sp?.audioMix) return seg
    const mul = sp.audioMix
    return {
      ...seg,
      intensity: typeof seg.intensity === 'number' ? seg.intensity : 0.45,
      musicGainMul: mul.musicGainMul,
      sfxGainMul: mul.sfxGainMul,
      narratorGainMul: mul.narratorGainMul,
      silencePadMs: mul.silencePadMs
    }
  })

  const avgTension =
    scenePlans.length > 0
      ? scenePlans.reduce((a, s) => a + (s.tension || 0), 0) / scenePlans.length
      : 0.35

  const musicGain =
    typeof plan.musicGain === 'number'
      ? Math.min(0.32, Math.max(0.12, plan.musicGain * (avgTension > 0.6 ? 0.94 : 1)))
      : plan.musicGain

  return {
    ...plan,
    segments,
    musicGain,
    cinematicMixVersion: 2,
    autoDirected: true
  }
}
