/**
 * Leonardo prompt length limits and priority-based compression (API max prompt 1500).
 */

import { resolveStyleProfile, strictStylePromptLine } from './visualStyleLock.js'
import { pipelineStageLog } from './pipelineStageLog.js'
import {
  buildCharacterAppearanceProfile,
  pickCastSlotsForScriptRow
} from '../character/characterIdentityMemory.js'
import { TEXT_FREE_NEGATIVE } from '../cinematic/masterStoryContext.js'
import { buildLeonardoNegativePrompt } from './leonardoPromptQuality.js'
import { characterReferencePromptFromBible } from '../cinematic/storyBible.js'
import { characterDNABlockForScene } from '../cinematic/characterDNA.js'
import { outfitLockPromptBlock } from '../cinematic/outfitLock.js'

export const LEONARDO_MAX_PROMPT = 1300
export const LEONARDO_MAX_NEGATIVE = 500

/** @type {Array<{ key: string, max: number }>} */
const MAIN_SECTION_PRIORITY = [
  { key: 'character', max: 420 },
  { key: 'action', max: 360 },
  { key: 'environment', max: 200 },
  { key: 'emotion', max: 120 },
  { key: 'style', max: 220 },
  { key: 'camera', max: 100 },
  { key: 'lighting', max: 90 }
]

function cleanWhitespace(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .trim()
}

function truncate(text, max) {
  const t = cleanWhitespace(text)
  if (!t || t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const sp = cut.lastIndexOf(' ')
  return `${sp > max * 0.55 ? cut.slice(0, sp) : cut}…`
}

/** Strip narration, dialogue dumps, master story blocks, repeated locks. */
export function stripLeonardoPromptBloat(text) {
  let t = String(text || '')
  t = t.replace(/\bFORBIDDEN:[^.]{0,400}/gi, '')
  t = t.replace(/USER PROMPT[^.]{0,400}\./gi, '')
  t = t.replace(/STORY CONTEXT:[\s\S]{0,900}/gi, '')
  t = t.replace(/MASTER STORY[\s\S]{0,900}/gi, '')
  t = t.replace(/CHARACTER CONSISTENCY ENGINE[\s\S]{0,1200}/gi, '')
  t = t.replace(/SCENE CONTINUITY[^.]{0,400}\./gi, '')
  t = t.replace(/\b(narration beat|composed_narration|dialogue:)[^.]{0,220}/gi, '')
  t = t.replace(/\b(the (husband|wife|man|woman) said|said,|whispered,)[^.]{0,120}/gi, '')
  return cleanWhitespace(t)
}

/**
 * Compact cast block for one scene (no repeated full story).
 * @param {Record<string, unknown>} scriptRow
 * @param {ReturnType<import('../character/characterIdentityMemory.js').buildCharacterIdentityMemory>} memory
 */
export function compactLeonardoIdentityBlock(scriptRow, memory = []) {
  if (!memory.length) return ''
  const slots = pickCastSlotsForScriptRow(scriptRow, memory)
  const lines = slots
    .map((s) => memory.find((m) => m.slot === s))
    .filter(Boolean)
    .map((m) => {
      const p =
        m.appearanceProfile ||
        buildCharacterAppearanceProfile(m.label, m.role || '', m.visualIdentity || '')
      const gender = p.gender && p.gender !== 'unknown' ? p.gender : 'neutral'
      return truncate(
        `${m.label} (${gender}, ${p.age}): hair ${p.hair}${p.hairColor ? ` ${p.hairColor}` : ''}; eyes ${p.eyeColor}; ` +
          `${p.clothing}; face ${p.facialFeatures}; body ${p.bodyType}; same look every scene`,
        220
      )
    })
  if (!lines.length && memory[0]) {
    const m = memory[0]
    const p =
      m.appearanceProfile ||
      buildCharacterAppearanceProfile(m.label, m.role || '', m.visualIdentity || '')
    lines.push(truncate(`${m.label}: ${p.hair}, ${p.eyeColor}, ${p.clothing}`, 200))
  }
  return `CAST LOCK: ${lines.join(' | ')}`
}

/**
 * Build a concise Leonardo main prompt (no full story / narration / dialogue).
 * @param {object} ctx
 */
export function buildCompactLeonardoScenePrompt(ctx = {}) {
  const { input = {}, scriptRow = {}, blueprint, castMemory = [], sceneIndex = 0 } = ctx
  const profile = resolveStyleProfile(input)
  const sceneNum = Number(scriptRow.scene) > 0 ? Number(scriptRow.scene) : sceneIndex + 1

  const brief = String(scriptRow.__sceneVisualBrief || '').trim()
  const visual = truncate(
    brief ||
      String(scriptRow.visual_description || blueprint?.cinematicComposition || scriptRow.action || '').trim(),
    380
  )
  const sceneBeat = visual

  const environment = truncate(
    String(
      scriptRow.environment ||
        scriptRow.location ||
        blueprint?.environment ||
        input.theme ||
        ''
    ).trim(),
    180
  )
  const emotion = truncate(
    String(scriptRow.mood || scriptRow.emotional_tone || blueprint?.emotion || '').trim(),
    100
  )
  const camera = truncate(
    String(scriptRow.camera || scriptRow.camera_angle || blueprint?.cameraAngle || 'cinematic medium shot').trim(),
    90
  )
  const lighting = truncate(
    String(scriptRow.lighting || blueprint?.lightingStyle || 'motivated cinematic light').trim(),
    85
  )
  const style = truncate(strictStylePromptLine(profile) || String(profile.leonardoCore || '').trim(), 280)
  const cref = characterReferencePromptFromBible(
    input.__storyBible || {},
    input.bibleCharacters || [],
    scriptRow
  )
  const dnaList = input.__characterDNA || input.__storyBible?.characterDNA || []
  const dnaBlock = characterDNABlockForScene(dnaList, scriptRow)
  const outfitBlock =
    Array.isArray(dnaList) && dnaList[0]?.outfitLock
      ? outfitLockPromptBlock(dnaList[0].outfitLock, scriptRow)
      : ''
  const identity = [
    dnaBlock,
    outfitBlock,
    cref,
    String(ctx.identityBlock || '').trim(),
    compactLeonardoIdentityBlock(scriptRow, castMemory)
  ]
    .filter(Boolean)
    .join(' ')

  const sections = {
    character: truncate(stripLeonardoPromptBloat(identity), MAIN_SECTION_PRIORITY[0].max),
    action: truncate(
      `Scene ${sceneNum}: ${sceneBeat || 'single clear story moment with readable body language'}. No text in image.`,
      MAIN_SECTION_PRIORITY[1].max
    ),
    environment: environment ? `Place: ${environment}.` : '',
    emotion: emotion ? `Mood: ${emotion}.` : '',
    style: style ? `Style: ${style}.` : '',
    camera: `Camera: ${camera}.`,
    lighting: `Light: ${lighting}.`
  }

  let prompt = MAIN_SECTION_PRIORITY.map(({ key }) => sections[key]).filter(Boolean).join(' ')
  prompt = stripLeonardoPromptBloat(prompt)
  return fitTextToLimit(prompt, LEONARDO_MAX_PROMPT)
}

function fitTextToLimit(text, limit) {
  let t = cleanWhitespace(text)
  if (t.length <= limit) return t
  const sentences = t.split(/(?<=[.!?])\s+/)
  const kept = []
  for (const s of sentences) {
    const next = kept.length ? `${kept.join(' ')} ${s}` : s
    if (next.length > limit) break
    kept.push(s)
  }
  if (kept.length) return kept.join(' ').trim()
  return truncate(t, limit)
}

function dedupeNegativeList(text) {
  const parts = String(text || '')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(parts)].join(', ')
}

/**
 * Validate and compress prompts before Leonardo API call.
 * @param {{ prompt?: string, negativePrompt?: string, scene?: number }} opts
 */
export function prepareLeonardoApiPrompts(opts = {}) {
  let prompt = stripLeonardoPromptBloat(opts.prompt || '')
  let negative_prompt = cleanWhitespace(opts.negativePrompt || opts.negative_prompt || TEXT_FREE_NEGATIVE)

  const mainBefore = prompt.length
  const negBefore = negative_prompt.length

  if (prompt.length > LEONARDO_MAX_PROMPT) {
    prompt = fitTextToLimit(prompt, LEONARDO_MAX_PROMPT)
  }
  if (negative_prompt.length > LEONARDO_MAX_NEGATIVE) {
    negative_prompt = truncate(dedupeNegativeList(negative_prompt), LEONARDO_MAX_NEGATIVE)
  }

  if (prompt.length > LEONARDO_MAX_PROMPT) {
    prompt = truncate(prompt, LEONARDO_MAX_PROMPT)
  }
  if (negative_prompt.length > LEONARDO_MAX_NEGATIVE) {
    negative_prompt = truncate(negative_prompt, LEONARDO_MAX_NEGATIVE)
  }

  const meta = {
    scene: opts.scene,
    mainLen: prompt.length,
    negLen: negative_prompt.length,
    mainTrimmed: mainBefore > prompt.length,
    negTrimmed: negBefore > negative_prompt.length,
    mainBefore,
    negBefore
  }

  pipelineStageLog('prompt_length_checked', meta)

  if (prompt.length > LEONARDO_MAX_PROMPT || negative_prompt.length > LEONARDO_MAX_NEGATIVE) {
    throw new Error(
      `Leonardo prompt optimization failed (main ${prompt.length}/${LEONARDO_MAX_PROMPT}, neg ${negative_prompt.length}/${LEONARDO_MAX_NEGATIVE})`
    )
  }

  return { prompt, negative_prompt, meta }
}

/**
 * @param {object} ctx — passed to buildCompactLeonardoScenePrompt
 * @param {object} input — studio input for negative prompt
 */
export function buildOptimizedLeonardoScenePrompts(ctx = {}, input = {}) {
  const prompt = buildCompactLeonardoScenePrompt(ctx)
  const negativePrompt = buildLeonardoNegativePrompt(input)
  const scene = Number(ctx.scriptRow?.scene) || ctx.sceneIndex + 1 || 0
  return prepareLeonardoApiPrompts({ prompt, negativePrompt, scene })
}
