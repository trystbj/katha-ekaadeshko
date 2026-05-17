/**
 * Auto trailer & recap — highlight scene selection (metadata for future export).
 */

/**
 * @param {Array<object>} scenes
 * @param {Array<{ narration?: string }>} script
 * @param {object} [cliffhanger]
 */
export function buildTrailerRecapPlan(scenes, script, cliffhanger) {
  const rows = Array.isArray(script) ? script : []
  const scores = scenes.map((sc, i) => {
    const r = sc.reasoning
    const blob = `${rows[i]?.narration || ''}`
    let score = (r?.cinematicImportance ?? 0.4) + (sc.tension ?? 0.3) * 0.3
    if (sc.memorySequence?.kind && sc.memorySequence.kind !== 'none') score += 0.15
    if (/\b(reveal|secret|finally|truth)\b/i.test(blob)) score += 0.2
    if (sc.actionLevel > 0.7) score += 0.15
    return { i, score }
  })
  scores.sort((a, b) => b.score - a.score)
  const highlightSceneIndices = scores.slice(0, 4).map((s) => s.i)
  const recapMontageIndices = scores
    .slice(0, 6)
    .map((s) => s.i)
    .sort((a, b) => a - b)

  let soundtrackPeakIndex = null
  let peak = 0
  for (let i = 0; i < scenes.length; i++) {
    const m = scenes[i]?.music?.intensity ?? 0
    if (m > peak) {
      peak = m
      soundtrackPeakIndex = i
    }
  }

  const teaserLine =
    cliffhanger?.suggestedLine?.trim() ||
    (rows.length ? String(rows[rows.length - 1]?.narration || '').slice(0, 120) : 'To be continued…')

  return {
    architectureVersion: 1,
    highlightSceneIndices,
    teaserLine: teaserLine.slice(0, 200),
    recapMontageIndices,
    soundtrackPeakIndex
  }
}
