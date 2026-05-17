/**
 * Episode-level pacing curve and per-scene beats.
 */

/**
 * @param {Array<{ tension?: number; suspenseLevel?: number; actionLevel?: number }>} scenePlans
 */
export function buildEpisodePacingPlan(scenePlans) {
  const n = scenePlans.length
  const tensionCurve = scenePlans.map((s) => s.tension ?? 0.35)
  let climaxSceneIndex = Math.max(1, Math.floor(n * 0.82))
  let peak = 0
  tensionCurve.forEach((t, i) => {
    if (t > peak) {
      peak = t
      climaxSceneIndex = i + 1
    }
  })
  const calmScenes = scenePlans
    .map((s, i) => ({ i: i + 1, t: s.tension ?? 0 }))
    .filter((x) => x.t < 0.38)
    .map((x) => x.i)

  const avg = tensionCurve.reduce((a, b) => a + b, 0) / Math.max(1, n)
  const globalTempo = avg > 0.62 ? 'fast' : avg < 0.4 ? 'slow' : 'moderate'

  return {
    globalTempo,
    climaxSceneIndex,
    calmScenes,
    tensionCurve
  }
}

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {number} sceneIndex 0-based
 * @param {number} totalScenes
 * @param {ReturnType<typeof buildEpisodePacingPlan>} episodePacing
 */
export function inferScenePacingBeat(ctx, sceneIndex, totalScenes, episodePacing) {
  const pos = totalScenes <= 1 ? 0 : sceneIndex / Math.max(1, totalScenes - 1)
  const curve = episodePacing?.tensionCurve?.[sceneIndex] ?? ctx.tension
  const beatWeight = curve
  const pauseAfterMs =
    ctx.emotion === 'suspense' || ctx.emotion === 'surprise'
      ? Math.round(200 + ctx.suspenseLevel * 350)
      : ctx.emotion === 'sadness'
        ? Math.round(280 + ctx.tension * 200)
        : pos > 0.85
          ? 320
          : 80
  const breathingSpace = ctx.emotion === 'peace' || ctx.emotion === 'sadness' || pos < 0.15

  return {
    beatWeight,
    pauseAfterMs,
    tensionContribution: curve,
    breathingSpace
  }
}
