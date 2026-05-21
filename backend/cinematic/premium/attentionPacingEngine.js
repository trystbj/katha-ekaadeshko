/**
 * AI pacing + attention / retention engine for shorts and long-form.
 */

/**
 * @param {Array<object>} sceneUnits
 * @param {Array<object>} emotionProfiles
 * @param {Array<{ narration?: string }>} script
 * @param {object} input
 */
export function buildAttentionPacingPlan(sceneUnits, emotionProfiles, script, input) {
  const n = sceneUnits.length
  const platform = String(input?.cinematicExportPreset || input?.publishPlatform || '').toLowerCase()
  const isShort =
    platform.includes('tiktok') ||
    platform.includes('reel') ||
    platform.includes('short') ||
    n <= 10

  const scenePacing = []
  let fatigue = 0
  const hookSceneIndices = []

  for (let i = 0; i < n; i++) {
    const unit = sceneUnits[i] || {}
    const ep = emotionProfiles[i] || {}
    const row = script[i] || {}
    const blob = `${row.narration || ''}`.toLowerCase()
    const weak = blob.length < 40 && unit.beatType !== 'emotional' && unit.beatType !== 'climax'
    const emotional = unit.beatType === 'emotional' || (ep.romance ?? 0) > 0.55 || ep.dramaticIntensity > 0.65
    const tense = (ep.suspense ?? 0) > 0.55 || (ep.tension ?? 0) > 0.65

    fatigue += tense ? 0.12 : emotional ? -0.06 : 0.04
    fatigue = Math.max(0, Math.min(1, fatigue))

    let durationMul = 1
    if (weak && isShort) durationMul = 0.82
    if (emotional) durationMul = Math.max(durationMul, 1.14)
    if (tense && isShort) durationMul = Math.min(durationMul, 0.92)
    if (i === 0 && isShort) {
      durationMul = 0.88
      hookSceneIndices.push(1)
    }
    if (i === Math.floor(n * 0.15) && tense) hookSceneIndices.push(i + 1)
    if (unit.beatType === 'climax' || ep.dramaticIntensity > 0.75) hookSceneIndices.push(i + 1)

    scenePacing.push({
      sceneIndex: i + 1,
      durationMul,
      attentionScore: Math.min(1, (ep.escalation ?? 0.4) + (emotional ? 0.2 : 0)),
      shortenWeak: weak && isShort,
      extendEmotional: emotional,
      burstPacing: tense && isShort,
      fatigueLevel: fatigue
    })
  }

  return {
    version: 1,
    isShortForm: isShort,
    hookSceneIndices: [...new Set(hookSceneIndices)].slice(0, 5),
    scenePacing,
    globalTempo: fatigue > 0.55 ? 'intense' : fatigue < 0.2 ? 'reflective' : 'balanced'
  }
}

/**
 * Apply attention pacing to enriched scenes (duration + pacing metadata).
 */
export function applyAttentionPacingToScenes(scenes, attentionPlan) {
  const map = new Map((attentionPlan?.scenePacing || []).map((p) => [p.sceneIndex, p]))
  return scenes.map((sc, i) => {
    const row = map.get(sc.sceneIndex ?? i + 1)
    if (!row) return sc
    const base = sc.durationMs ?? 4000
    const durationMs = Math.round(Math.min(14000, Math.max(2400, base * row.durationMul)))
    return {
      ...sc,
      durationMs,
      pacing: {
        ...(sc.pacing || {}),
        attentionScore: row.attentionScore,
        shortenWeak: row.shortenWeak,
        extendEmotional: row.extendEmotional
      },
      premiumPacing: row
    }
  })
}
