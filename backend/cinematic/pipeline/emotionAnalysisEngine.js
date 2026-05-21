/**
 * Continuous emotional analysis — extends sceneContext into orchestration profiles.
 */

import { analyzeSceneContext } from '../sceneContext.js'

function emotionScalars(ctx, beatType, textBlob = '') {
  const e = ctx.emotion
  const sadness = e === 'sadness' ? 0.85 : 0.1
  const fear = e === 'fear' ? 0.9 : 0.15
  const tension = ctx.tension ?? 0.35
  const hope = e === 'joy' || e === 'peace' || e === 'wonder' ? 0.7 : 0.2
  const excitement = e === 'joy' || ctx.actionLevel > 0.6 ? 0.75 : 0.2
  const mystery = e === 'suspense' || beatType === 'reveal' ? 0.8 : 0.25
  const suspense = ctx.suspenseLevel ?? 0.25
  const warmth = e === 'peace' || e === 'joy' ? 0.75 : e === 'sadness' ? 0.2 : 0.45
  const danger = fear > 0.5 || tension > 0.7 ? Math.max(fear, tension) : 0.15
  const escalation = Math.min(1, tension * 0.4 + ctx.actionLevel * 0.35 + suspense * 0.25)
  const romance =
    e === 'joy' && warmth > 0.55
      ? Math.min(1, warmth * 0.85 + hope * 0.2)
      : /\b(love|kiss|heart|romance|embrace)\b/i.test(`${ctx.narration || ''}`)
        ? 0.72
        : 0.12
  const dramaticIntensity = Math.min(
    1,
    tension * 0.35 + suspense * 0.3 + escalation * 0.25 + (e === 'anger' || e === 'fear' ? 0.2 : 0)
  )

  return {
    primary: e,
    sadness,
    fear,
    tension,
    hope,
    excitement,
    mystery,
    suspense,
    warmth,
    danger,
    escalation,
    romance,
    dramaticIntensity
  }
}

/**
 * @param {Array<object>} sceneUnits from scene breakdown
 * @param {Array<{ narration?: string, visual_description?: string }>} script
 * @param {object} input
 */
export function buildEmotionProfiles(sceneUnits, script, input) {
  const rows = Array.isArray(script) ? script : []
  return sceneUnits.map((unit, i) => {
    const row = rows[i] || {}
    const ctx = analyzeSceneContext({
      narration: row.narration,
      visualDescription: row.visual_description,
      genre: input?.genre,
      storyTone: input?.storyTone
    })
    const blob = `${row.narration || ''} ${row.visual_description || ''}`
    return emotionScalars(ctx, unit.beatType, blob)
  })
}
