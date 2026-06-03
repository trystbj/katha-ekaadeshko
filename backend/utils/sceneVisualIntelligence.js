/**
 * Enrich script rows with professional visual descriptions for Leonardo (deterministic).
 */

import { pipelineStageLog } from './pipelineStageLog.js'
import {
  buildCharacterIdentityMemory,
  pickCastSlotsForScriptRow
} from '../character/characterIdentityMemory.js'

function castLineForScene(row, castMemory = []) {
  if (!castMemory.length) return ''
  const slots = pickCastSlotsForScriptRow(row, castMemory)
  return slots
    .map((s) => castMemory.find((m) => m.slot === s))
    .filter(Boolean)
    .map((m) => {
      const g = m.gender && m.gender !== 'unknown' ? m.gender : 'neutral'
      return `${m.label} (${g}): ${String(m.visualIdentity || m.baseImagePrompt || '').slice(0, 120)}`
    })
    .join('; ')
}

/**
 * Build a dense visual description from scene row + story context (never title-only; no raw narration dump).
 * @param {Record<string, unknown>} row
 * @param {object} input
 * @param {object} [story]
 * @param {object[]} [castMemory]
 */
export function buildProfessionalSceneVisualDescription(row, input = {}, story = {}, castMemory = []) {
  const visual = String(row.visual_description || '').trim()
  const action = String(row.action || '').trim()
  const mood = String(row.mood || row.emotional_tone || input.storyTone || '').trim()
  const env = String(row.environment || row.location || row.setting || story.setting || input.theme || '').trim()
  const weather = String(row.weather || '').trim()
  const time = String(row.time_of_day || '').trim()
  const lighting = String(row.lighting || 'motivated cinematic light').trim()
  const camera = String(row.camera || row.camera_angle || 'medium shot, cinematic framing').trim()
  const castLine = castLineForScene(row, castMemory)
  const explicitCast = Array.isArray(row.characters_in_shot)
    ? row.characters_in_shot.map((c) => String(c).trim()).filter(Boolean)
    : []

  const who =
    castLine ||
    (explicitCast.length ? `Characters present: ${explicitCast.join(', ')}.` : '') ||
    'Only established story cast — no new unnamed faces.'

  const storyEvent =
    visual ||
    action ||
    'A single clear story beat with readable body language, gesture, and emotional focus.'

  const environmentBlock = [
    env ? `Location: ${env}.` : '',
    weather ? `Weather: ${weather}.` : '',
    time ? `Time: ${time}.` : '',
    'Atmosphere and architecture match the story world.'
  ]
    .filter(Boolean)
    .join(' ')

  const characterBlock = [
    who,
    'Expression, pose, action, and body language visible.',
    mood ? `Emotional tone: ${mood}.` : 'Emotional tone matches the story beat.'
  ].join(' ')

  const visualStoryBlock = [
    `Story event (illustrate exactly): ${storyEvent}`,
    `Camera: ${camera}.`,
    `Lighting: ${lighting}.`,
    'Cinematic focal point and composition support the narrative moment.'
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
  const castMemory = buildCharacterIdentityMemory(
    Array.isArray(story?.characters) ? story.characters : input.bibleCharacters || []
  )
  pipelineStageLog('scene_descriptions_created', { count: rows.length })
  return rows.map((row, i) => {
    const enriched = buildProfessionalSceneVisualDescription(row, input, story, castMemory)
    const prior = String(row.visual_description || '').trim()
    const merged = prior.length >= 80 ? `${prior} ${enriched}`.trim() : enriched
    const slots = pickCastSlotsForScriptRow(row, castMemory)
    const names = slots
      .map((s) => castMemory.find((m) => m.slot === s)?.label)
      .filter(Boolean)
    return {
      ...row,
      visual_description: merged.slice(0, 1200),
      characters_in_shot: names.length ? names : row.characters_in_shot,
      scene: Number(row.scene) > 0 ? row.scene : i + 1
    }
  })
}
