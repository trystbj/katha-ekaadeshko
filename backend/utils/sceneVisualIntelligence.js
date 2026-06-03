/**
 * Enrich script rows with professional visual descriptions for Leonardo (deterministic).
 */

import { pipelineStageLog } from './pipelineStageLog.js'

function sceneCastNames(row) {
  if (Array.isArray(row.characters_in_shot) && row.characters_in_shot.length) {
    return row.characters_in_shot.map((c) => String(c).trim()).filter(Boolean)
  }
  const blob = `${row.visual_description || ''} ${row.narration || ''}`
  const names = []
  const re = /\b(the [a-z]+|Ravi|Sita|Arjun|Maya|[A-Z][a-z]+)\b/g
  let m
  while ((m = re.exec(blob))) names.push(m[1])
  return [...new Set(names)].slice(0, 4)
}

/**
 * Build a dense visual description from scene row + story context (never title-only).
 * @param {Record<string, unknown>} row
 * @param {object} input
 * @param {object} [story]
 */
export function buildProfessionalSceneVisualDescription(row, input = {}, story = {}) {
  const visual = String(row.visual_description || '').trim()
  const action = String(row.action || '').trim()
  const narration = String(row.narration || '').trim()
  const mood = String(row.mood || row.emotional_tone || input.storyTone || '').trim()
  const env = String(row.environment || row.location || row.setting || story.setting || input.theme || '').trim()
  const weather = String(row.weather || '').trim()
  const time = String(row.time_of_day || '').trim()
  const lighting = String(row.lighting || 'motivated cinematic light').trim()
  const camera = String(row.camera || row.camera_angle || 'medium shot, cinematic framing').trim()
  const cast = sceneCastNames(row)

  const who =
    cast.length > 0
      ? `Characters present: ${cast.join(', ')}.`
      : 'Focus on the story cast established in prior scenes — no new unnamed faces.'

  const doing =
    visual ||
    action ||
    (narration ? `Visible action implied by narration: ${narration.slice(0, 220)}` : '') ||
    'A single clear story beat with readable body language and emotional focus.'

  const environmentBlock = [
    env ? `Location: ${env}.` : '',
    weather ? `Weather: ${weather}.` : '',
    time ? `Time: ${time}.` : '',
    'Surroundings and architecture support the regional story world.'
  ]
    .filter(Boolean)
    .join(' ')

  const characterBlock = [
    who,
    mood ? `Emotional atmosphere: ${mood}.` : 'Emotional atmosphere matches the story beat.',
    'Visible expressions, pose, gesture, and interaction between characters.'
  ].join(' ')

  const visualStoryBlock = [
    `Focal point: ${doing}`,
    `Camera: ${camera}.`,
    `Lighting: ${lighting}.`,
    'Cinematic composition with environmental storytelling details.'
  ].join(' ')

  return [environmentBlock, characterBlock, visualStoryBlock].filter(Boolean).join(' ')
}

/**
 * @param {Record<string, unknown>[]} script
 * @param {object} input
 * @param {object} [story]
 */
export function enrichScriptRowsForVisuals(script, input = {}, story = {}) {
  const rows = Array.isArray(script) ? script : []
  pipelineStageLog('scene_descriptions_created', { count: rows.length })
  return rows.map((row, i) => {
    const enriched = buildProfessionalSceneVisualDescription(row, input, story)
    const prior = String(row.visual_description || '').trim()
    const merged =
      prior.length >= 80
        ? `${prior} ${enriched}`.trim()
        : enriched
    return {
      ...row,
      visual_description: merged.slice(0, 1200),
      scene: Number(row.scene) > 0 ? row.scene : i + 1
    }
  })
}
