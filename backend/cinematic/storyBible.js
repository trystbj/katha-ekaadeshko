/**
 * StoryBible — single source of truth after story generation (story, cast, style, scenes).
 */

import { buildMasterStoryContextDeterministic } from './masterStoryContext.js'
import {
  buildCharacterIdentityMemory,
  pickCastSlotsForScriptRow
} from '../character/characterIdentityMemory.js'
import { resolveStyleProfile, strictStylePromptLine } from '../utils/visualStyleLock.js'
import { pipelineStageLog } from '../utils/pipelineStageLog.js'

/**
 * @param {object} story
 * @param {object} input
 * @param {Record<string, unknown>[]} [script]
 * @param {string} [region]
 */
export function buildStoryBible(story, input = {}, script = [], region = '') {
  const master = buildMasterStoryContextDeterministic(story, input, region)
  const styleProfile = resolveStyleProfile(input)
  const scenes = (Array.isArray(script) ? script : []).map((row, i) => {
    const sceneNum = Number(row?.scene) > 0 ? Number(row.scene) : i + 1
    return {
      scene: sceneNum,
      location: String(row.environment || row.location || row.setting || '').trim(),
      emotion: String(row.mood || row.emotional_tone || '').trim(),
      action: String(row.action || row.visual_description || '').trim().slice(0, 400),
      charactersInShot: Array.isArray(row.characters_in_shot) ? row.characters_in_shot : []
    }
  })

  const bible = {
    version: 1,
    story: {
      title: String(story?.title || '').trim(),
      genre: String(input.genre || '').trim(),
      setting: String(story?.setting || input.theme || '').trim(),
      tone: String(input.storyTone || input.genre || '').trim(),
      timeline: 'linear story progression — no unexplained time jumps'
    },
    characters: master.characterAppearanceProfiles || [],
    characterIdentityMemory: master.memory?.character_reference_memory || [],
    visualStyle: {
      styleId: input.styleId || 'soft_anime_fantasy',
      styleKey: styleProfile.key,
      styleRules: strictStylePromptLine(styleProfile),
      renderingRules: String(styleProfile.leonardoForbidden || '').slice(0, 400)
    },
    scenes,
    masterStoryContext: master
  }

  pipelineStageLog('story_bible_created', {
    characters: bible.characters.length,
    scenes: scenes.length,
    style: bible.visualStyle.styleId
  })
  return bible
}

/**
 * @param {Record<string, unknown>} row
 * @param {object} storyBible
 * @param {ReturnType<typeof buildCharacterIdentityMemory>} castMemory
 */
export function buildSceneVisualBrief(row, storyBible = {}, castMemory = []) {
  const slots = pickCastSlotsForScriptRow(row, castMemory)
  const castLines = slots
    .map((s) => castMemory.find((m) => m.slot === s))
    .filter(Boolean)
    .map((m) => {
      const g = m.gender && m.gender !== 'unknown' ? m.gender : 'neutral'
      return `${m.label} (${g}): pose/action visible; emotion matches scene; appearance ${String(m.visualIdentity || '').slice(0, 100)}`
    })

  const env = [
    `Location: ${String(row.environment || row.location || storyBible.story?.setting || '').trim() || 'story setting'}.`,
    row.weather ? `Weather: ${row.weather}.` : '',
    row.time_of_day ? `Time: ${row.time_of_day}.` : '',
    `Atmosphere: ${String(row.mood || row.emotional_tone || storyBible.story?.tone || 'cinematic')}.`
  ]
    .filter(Boolean)
    .join(' ')

  const chars = [
    castLines.length ? `Characters: ${castLines.join('; ')}.` : 'Only locked cast — no new faces.',
    'Expressions, pose, gesture, and body language readable.'
  ].join(' ')

  const event = String(row.visual_description || row.action || '').trim()
  const storyEvent = [
    `Story event: ${event || 'single clear narrative beat'}.`,
    row.narration
      ? `Significance: emotional story moment (do not paint narration text).`
      : 'Significance: advances plot.'
  ].join(' ')

  const cinema = [
    `Shot: ${String(row.camera || row.camera_angle || 'motivated medium shot')}.`,
    `Lighting: ${String(row.lighting || 'motivated cinematic light')}.`,
    'Composition: one focal action, cinematic framing, no collage.'
  ].join(' ')

  return [env, chars, storyEvent, cinema].filter(Boolean).join(' ').slice(0, 900)
}

/**
 * @param {Record<string, unknown>[]} script
 * @param {object} storyBible
 * @param {object} input
 */
export function attachSceneVisualBriefsToScript(script, storyBible, input = {}) {
  const castMemory = buildCharacterIdentityMemory(
    Array.isArray(input.bibleCharacters) && input.bibleCharacters.length
      ? input.bibleCharacters
      : storyBible.masterStoryContext?.mainCharacters || []
  )
  return script.map((row, i) => {
    const brief = buildSceneVisualBrief(row, storyBible, castMemory)
    pipelineStageLog('scene_visual_brief_created', {
      scene: Number(row.scene) || i + 1,
      chars: brief.length
    })
    return {
      ...row,
      __sceneVisualBrief: brief,
      visual_description: brief
    }
  })
}

/**
 * Portrait + appearance locks for Leonardo (must match character stills).
 * @param {object} storyBible
 * @param {Array<{ name?: string, baseImageUrl?: string, visualIdentity?: string }>} bibleCharacters
 * @param {Record<string, unknown>} scriptRow
 */
export function characterReferencePromptFromBible(storyBible, bibleCharacters = [], scriptRow = {}) {
  const castMemory = buildCharacterIdentityMemory(
    bibleCharacters.length
      ? bibleCharacters
      : storyBible.masterStoryContext?.memory?.character_reference_memory || []
  )
  const slots = pickCastSlotsForScriptRow(scriptRow, castMemory)
  const lines = []
  for (const slot of slots) {
    const m = castMemory.find((x) => x.slot === slot)
    if (!m) continue
    const ch = bibleCharacters.find(
      (c) => String(c.name || '').toLowerCase() === m.label.toLowerCase()
    )
    const portrait = ch?.baseImageUrl ? String(ch.baseImageUrl).trim() : ''
    const g = m.gender && m.gender !== 'unknown' ? m.gender : 'neutral'
    lines.push(
      `${m.label} (${g}): MUST match portrait reference${portrait ? ` ${portrait.slice(0, 80)}` : ''}; ` +
        `same face, hair, eyes, clothing as character still; ${String(m.visualIdentity || '').slice(0, 120)}`
    )
  }
  if (!lines.length) return ''
  return `CHARACTER REFERENCE LOCK: ${lines.join(' | ')} Reuse exact portrait identity — never redesign.`
}
