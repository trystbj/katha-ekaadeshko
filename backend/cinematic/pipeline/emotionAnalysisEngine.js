/**
 * Continuous emotional analysis — extends sceneContext into orchestration profiles.
 */

import { analyzeSceneContext } from '../sceneContext.js'

function emotionScalars(ctx, beatType) {
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
    escalation
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
    return emotionScalars(ctx, unit.beatType)
  })
}
