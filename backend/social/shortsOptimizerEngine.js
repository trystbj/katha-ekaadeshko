/**
 * Shorts / Reels viral moment analyzer (backend — mirrors core/social/shortsOptimizer).
 */

const SECONDS_PER_SCENE = 4

function sceneIntensity(text) {
  const t = String(text || '').trim()
  if (!t) return 0.2
  const exclam = (t.match(/!/g) || []).length
  const question = (t.match(/\?/g) || []).length
  const len = Math.min(t.length / 120, 1)
  return Math.min(1, 0.25 + len * 0.4 + exclam * 0.08 + question * 0.06)
}

/**
 * @param {object} input
 */
export function optimizeForShorts(input) {
  const scenes = (input.sceneTexts || []).map((s) => String(s || '').trim()).filter(Boolean)
  const planScenes = input.cinematicPlan?.scenes || []
  const tips = []
  const clips = []

  let bestIx = 0
  let bestScore = 0
  for (let i = 0; i < scenes.length; i++) {
    const planSc = planScenes[i] || {}
    const pacing = planSc.pacing || {}
    const emotion = planSc.emotion || {}
    const score =
      sceneIntensity(scenes[i]) * 0.55 +
      (typeof pacing.beatWeight === 'number' ? pacing.beatWeight : 0.5) * 0.25 +
      (typeof emotion.intensity === 'number' ? emotion.intensity : 0.5) * 0.2
    if (score > bestScore) {
      bestScore = score
      bestIx = i
    }
  }

  const totalDurationSec =
    typeof input.totalDurationSec === 'number' ? input.totalDurationSec : scenes.length * SECONDS_PER_SCENE

  if (scenes[0]) {
    clips.push({
      id: 'hook-open',
      label: 'Opening hook',
      startSec: 0,
      endSec: Math.min(15, totalDurationSec * 0.25),
      reason: 'First scene drives scroll-stop for Shorts/Reels.',
      hookLine: scenes[0].slice(0, 96)
    })
  }

  if (scenes[bestIx]) {
    const start = bestIx * SECONDS_PER_SCENE
    clips.push({
      id: `peak-${bestIx}`,
      label: 'Emotional peak',
      startSec: start,
      endSec: start + Math.min(30, SECONDS_PER_SCENE * 3),
      reason: 'Highest emotional/pacing intensity in episode.',
      hookLine: scenes[bestIx].slice(0, 96)
    })
  }

  const lastIx = scenes.length - 1
  if (lastIx > 0 && scenes[lastIx]) {
    const start = lastIx * SECONDS_PER_SCENE
    clips.push({
      id: 'cliffhanger',
      label: 'Cliffhanger teaser',
      startSec: Math.max(0, start - 2),
      endSec: start + SECONDS_PER_SCENE * 2,
      reason: 'End beat — strong for episode previews.',
      hookLine: scenes[lastIx].slice(0, 96)
    })
  }

  if (scenes.length > 4) tips.push('Episode pacing skews long — consider a 30–45s teaser clip for TikTok.')
  if (bestScore < 0.45) tips.push('Add a stronger hook line in the first 3 seconds.')

  const pacingScore = scenes.length
    ? scenes.reduce((a, t, i) => a + sceneIntensity(t) + (planScenes[i] ? 0.1 : 0), 0) / scenes.length
    : 0.5

  return {
    version: 1,
    hookStartSec: 0,
    thumbnailFrameSec: bestIx * SECONDS_PER_SCENE + 1,
    pacingScore: Math.min(1, pacingScore),
    emotionalPeakSceneIndex: bestIx + 1,
    clips: clips.slice(0, 6),
    tips: tips.slice(0, 6)
  }
}

/**
 * @param {object} input
 */
export function analyzeShortsOptimization(input) {
  const episode = input?.episode
  const sceneTexts = (episode?.scenes || []).map((s) => String(s.text || ''))
  return optimizeForShorts({
    sceneTexts,
    cinematicPlan: episode?.cinematicDirectorPlan,
    totalDurationSec: input?.totalDurationSec
  })
}
