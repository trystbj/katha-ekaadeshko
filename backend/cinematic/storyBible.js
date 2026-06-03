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
import { buildAllCharacterDNA, characterDNABlockForScene } from './characterDNA.js'

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

  const characterDNA = buildAllCharacterDNA(story?.characters || [], {
    country: input.country,
    theme: input.theme || input.seedLine
  })

  const bible = {
    version: 2,
    story: {
      title: String(story?.title || '').trim(),
      genre: String(input.genre || '').trim(),
      setting: String(story?.setting || input.theme || '').trim(),
      tone: String(input.storyTone || input.genre || '').trim(),
      timeline: 'linear story progression — no unexplained time jumps'
    },
    characters: master.characterAppearanceProfiles || [],
    characterDNA,
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
  const dnaList = Array.isArray(storyBible.characterDNA) ? storyBible.characterDNA : []
  const dnaScene = characterDNABlockForScene(dnaList, row)

  const slots = pickCastSlotsForScriptRow(row, castMemory)
  const castLines = slots
    .map((s) => castMemory.find((m) => m.slot === s))
    .filter(Boolean)
    .map((m) => {
      const g = m.gender && m.gender !== 'unknown' ? m.gender : 'neutral'
      const dna = dnaList.find((d) => String(d.name || '').toLowerCase() === m.label.toLowerCase())
      const look = dna
        ? `${dna.hairstyle}, ${dna.clothing}, ${dna.eyeColor}`
        : String(m.visualIdentity || '').slice(0, 100)
      return `${m.label} (${g}): ${String(row.action || 'active in story beat').slice(0, 80)}; emotion ${String(row.mood || row.emotional_tone || 'story-true')}; look ${look}`
    })

  const event = String(row.action || row.visual_description || '').trim()
  const storyEvent = [
    `PRIMARY STORY EVENT: ${event || 'single clear narrative beat with visible action'}.`,
    'Image must show WHO is doing WHAT — not empty landscape.',
    row.narration ? `Emotional beat (do not render text): ${String(row.mood || row.emotional_tone || 'cinematic')}.` : ''
  ]
    .filter(Boolean)
    .join(' ')

  const chars = [
    castLines.length ? `CAST IN SHOT: ${castLines.join('; ')}.` : 'Only locked cast — no new faces.',
    dnaScene ? dnaScene.slice(0, 280) : '',
    'Readable pose, gesture, expression.'
  ]
    .filter(Boolean)
    .join(' ')

  const env = [
    `SUPPORTING ENVIRONMENT: ${String(row.environment || row.location || storyBible.story?.setting || '').trim() || 'story setting'}.`,
    row.weather ? `Weather: ${row.weather}.` : '',
    row.time_of_day ? `Time: ${row.time_of_day}.` : '',
    `Atmosphere supports action — background secondary.`
  ]
    .filter(Boolean)
    .join(' ')

  const cinema = [
    `Framing: ${String(row.camera || row.camera_angle || 'motivated medium shot')}.`,
    `Lighting: ${String(row.lighting || 'motivated cinematic light')}.`,
    `Focal point: character action and story beat.`,
    `Style: ${String(storyBible.visualStyle?.styleRules || 'locked studio style')}.`
  ].join(' ')

  return [storyEvent, chars, env, cinema].filter(Boolean).join(' ').slice(0, 950)
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
