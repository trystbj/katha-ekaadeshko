/**
 * Advanced face expression + cinematic lighting per scene.
 */

import { inferCharacterExpression } from '../characterExpression.js'
import { analyzeSceneContext } from '../sceneContext.js'

const LIGHTING_BY_MOOD = {
  romance: { key: 'warm_sunset', rim: 0.55, fill: 0.42, temperature: 'warm' },
  sadness: { key: 'cold_blue', rim: 0.2, fill: 0.35, temperature: 'cool' },
  fear: { key: 'horror_shadow', rim: 0.15, fill: 0.18, temperature: 'cold' },
  joy: { key: 'soft_glow', rim: 0.48, fill: 0.55, temperature: 'golden' },
  suspense: { key: 'dramatic_backlight', rim: 0.62, fill: 0.22, temperature: 'neutral' },
  neutral: { key: 'balanced_cinematic', rim: 0.38, fill: 0.45, temperature: 'neutral' }
}

function lightingForContext(ctx, emotionProfile) {
  if ((emotionProfile?.romance ?? 0) > 0.55) return LIGHTING_BY_MOOD.romance
  if (ctx.emotion === 'sadness') return LIGHTING_BY_MOOD.sadness
  if (ctx.emotion === 'fear' || (emotionProfile?.suspense ?? 0) > 0.6) return LIGHTING_BY_MOOD.fear
  if (ctx.emotion === 'joy' || ctx.emotion === 'peace') return LIGHTING_BY_MOOD.joy
  if (ctx.emotion === 'suspense' || ctx.emotion === 'tension') return LIGHTING_BY_MOOD.suspense
  return LIGHTING_BY_MOOD.neutral
}

/**
 * @param {Array<object>} enrichedScenes
 * @param {Array<object>} emotionProfiles
 * @param {Array<{ narration?: string; visual_description?: string }>} script
 * @param {object} input
 */
export function applyExpressionAndLightingToScenes(enrichedScenes, emotionProfiles, script, input) {
  return enrichedScenes.map((sc, i) => {
    const row = script[i] || {}
    const ctx = analyzeSceneContext({
      narration: row.narration,
      visualDescription: row.visual_description,
      genre: input?.genre,
      storyTone: input?.storyTone
    })
    const expression = inferCharacterExpression(ctx, input?.styleId)
    const lighting = lightingForContext(ctx, emotionProfiles[i])

    if (ctx.emotion === 'sadness') {
      expression.mood = 'sad'
      expression.eyeMotion = 'watery'
      expression.blinkRate = 'slow'
    }
    if (ctx.emotion === 'anger') expression.mood = 'anger'
    if (/\b(embarrass|blush|shy)\b/i.test(`${row.narration}`)) expression.mood = 'embarrassed'
    if (/\b(cry|tear|sob)\b/i.test(`${row.narration}`)) {
      expression.mood = 'crying'
      expression.intensity = 0.82
    }
    if (/\b(silent|pause|still)\b/i.test(`${row.narration}`)) expression.mood = 'emotional_silence'

    return {
      ...sc,
      expression: { ...(sc.expression || {}), ...expression },
      lighting: { ...(sc.lighting || {}), cinematic: lighting }
    }
  })
}
