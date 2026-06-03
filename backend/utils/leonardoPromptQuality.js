/**
 * Leonardo prompt enrichment, validation, negatives, and scene continuity.
 * Used by leonardoService and regeneration — no UI or pipeline stage changes.
 */

import { resolveStyleProfile } from './visualStyleLock.js'
import { TEXT_FREE_NEGATIVE } from '../cinematic/masterStoryContext.js'
import {
  buildCharacterAppearanceProfile,
  buildCharacterIdentityMemory,
  pickCastSlotsForScriptRow
} from '../character/characterIdentityMemory.js'
import {
  buildCharacterVisualLocks,
  characterConsistencyPromptBlock
} from '../services/cinematic/characterConsistencyEngine.js'
import {
  buildScenePromptFromMasterContext,
  priorSceneSummaryFromRow
} from '../cinematic/masterStoryContext.js'
import { continuityBlockForScene } from '../services/continuity/smartContinuityEngine.js'
import { buildSmartContinuityPack } from '../services/continuity/smartContinuityEngine.js'

/** Anatomy / quality negatives for Leonardo API `negative_prompt`. */
export const LEONARDO_QUALITY_NEGATIVE =
  'blurry, low quality, low resolution, extra fingers, extra limbs, duplicate people, duplicate faces, cropped heads, bad anatomy, distorted hands, malformed eyes, floating objects, random artifacts, inconsistent character appearance, mismatched clothing, wrong hairstyle, age shift, face redesign, deformed body'

/**
 * @param {object} input normalized studio input
 * @returns {string}
 */
export function buildLeonardoNegativePrompt(input = {}) {
  const profile = resolveStyleProfile(input)
  const hybrid = profile.key?.includes('+')
  const styleNeg = hybrid
    ? ''
    : String(profile.leonardoForbidden || '')
        .replace(/^FORBIDDEN[^:]*:\s*/i, '')
        .replace(/unless hybrid mode[^.]*\.?/gi, '')
        .trim()
  return [TEXT_FREE_NEGATIVE, LEONARDO_QUALITY_NEGATIVE, styleNeg].filter(Boolean).join(', ')
}

/**
 * @param {Record<string, unknown>[]} script
 * @param {number} index
 * @returns {string}
 */
export function priorSceneContinuityBlock(script, index) {
  if (!Array.isArray(script) || index < 1 || !script[index - 1]) return ''
  const prior = priorSceneSummaryFromRow(script[index - 1])
  if (!prior) return ''
  return `SCENE CONTINUITY (from previous beat): ${prior}. Same cast, wardrobe, and world — logical progression only.`
}

/**
 * Merge character consistency + master + continuity into generation context.
 * @param {object} opts
 */
export function mergeCharacterPromptLayers(opts = {}) {
  const {
    input = {},
    characters = [],
    identityBlock = '',
    scriptRow,
    script = [],
    sceneIndex = 0
  } = opts

  const blocks = []
  const id = String(identityBlock || '').trim()
  if (id) blocks.push(id)

  const existing = String(input.__characterConsistencyBlock || '').trim()
  if (existing) {
    blocks.push(existing)
  } else if (characters.length) {
    const locks = buildCharacterVisualLocks(characters, input.__characterVisualLocks)
    const cc = characterConsistencyPromptBlock(locks)
    if (cc) blocks.push(cc)
  }

  const cref = String(input.__characterReferencePrompt || '').trim()
  if (cref && !blocks.some((b) => b.includes(cref.slice(0, 40)))) blocks.push(cref)

  const sceneNum = Number(scriptRow?.scene) > 0 ? Number(scriptRow.scene) : sceneIndex + 1
  const masterCtx = input.__masterStoryContext || input.masterStoryContext
  const perScene = Array.isArray(input.__sceneMasterContextBlocks)
    ? String(input.__sceneMasterContextBlocks[sceneIndex] || '').trim()
    : ''
  if (perScene) {
    blocks.push(perScene)
  } else if (masterCtx && scriptRow) {
    const prior =
      sceneIndex > 0 && script[sceneIndex - 1]
        ? priorSceneSummaryFromRow(script[sceneIndex - 1])
        : ''
    const m = buildScenePromptFromMasterContext(masterCtx, scriptRow, sceneNum, prior)
    if (m) blocks.push(m)
  }

  const contBlocks = Array.isArray(input.__sceneContinuityBlocks)
    ? String(input.__sceneContinuityBlocks[sceneIndex] || '').trim()
    : ''
  if (contBlocks) {
    blocks.push(contBlocks)
  } else if (!input.__continuityPack && script.length > 1) {
    const pack = buildSmartContinuityPack({
      story: { characters },
      script,
      images: []
    })
    const c = continuityBlockForScene(pack, sceneNum)
    if (c) blocks.push(c)
  } else if (input.__continuityPack) {
    const c = continuityBlockForScene(input.__continuityPack, sceneNum)
    if (c) blocks.push(c)
  }

  const priorOnly = priorSceneContinuityBlock(script, sceneIndex)
  if (priorOnly && !blocks.some((b) => b.includes('SCENE CONTINUITY'))) blocks.push(priorOnly)

  return blocks.filter(Boolean).join('\n\n')
}

/**
 * Verify cast + permanent profiles exist before Leonardo.
 * @param {object} opts
 */
export function verifySceneCharacterProfilesForLeonardo(opts = {}) {
  const { scriptRow, castMemory = [], characters = [] } = opts
  const issues = []
  const memory =
    Array.isArray(castMemory) && castMemory.length
      ? castMemory
      : buildCharacterIdentityMemory(Array.isArray(characters) ? characters : [])

  if (!memory.length) {
    issues.push('no_character_profiles')
    return { ok: false, issues, castMemory: memory, slots: [] }
  }

  const visual = String(scriptRow?.visual_description || scriptRow?.action || '').trim()
  if (visual.length < 40) issues.push('scene_description_too_short')

  const slots = pickCastSlotsForScriptRow(scriptRow, memory)
  for (const slot of slots) {
    const m = memory.find((x) => x.slot === slot)
    if (!m) {
      issues.push('missing_character_slot')
      continue
    }
    const p =
      m.appearanceProfile ||
      buildCharacterAppearanceProfile(m.label, m.role || '', m.visualIdentity || '')
    if (!String(p.hair || '').trim() || !String(p.clothing || '').trim()) {
      issues.push(`incomplete_profile_${m.label}`)
    }
  }

  const explicitCast = Array.isArray(scriptRow?.characters_in_shot)
    ? scriptRow.characters_in_shot.map((c) => String(c).trim()).filter(Boolean)
    : []
  if (explicitCast.length) {
    const blob = visual.toLowerCase()
    for (const name of explicitCast) {
      if (name.length > 2 && blob.length > 10 && !blob.includes(name.toLowerCase())) {
        issues.push(`scene_missing_cast_${name}`)
      }
    }
  }

  return { ok: issues.length === 0, issues, castMemory: memory, slots }
}

/**
 * Audit prompt layers (priority: user → story → characters → scene → style).
 * @param {string} prompt
 */
export function auditLeonardoPromptCompliance(prompt, ctx = {}) {
  const p = String(prompt || '').toLowerCase()
  const missing = []
  const { input = {} } = ctx
  if (String(input.seedLine || input.theme || '').trim() && !/user prompt|highest priority/i.test(p)) {
    missing.push('user')
  }
  if (
    String(input.__masterStoryContextBlock || input.theme || '').trim() &&
    !/story context|master story|narrative|continuity/i.test(p)
  ) {
    missing.push('story')
  }
  if (!/character (identity|consistency|profile)|permanent profile|same exact character/i.test(p)) {
    missing.push('character')
  }
  if (!/scene \d|what:|where:|visual blueprint|composition:/i.test(p)) {
    missing.push('scene')
  }
  if (!/style lock|leonardocore|visual style lock/i.test(p)) {
    missing.push('style')
  }
  return { ok: missing.length === 0, missing }
}

/**
 * Rebuild Leonardo prompt in required priority order (deterministic).
 * @param {object} ctx
 */
export function rebuildLeonardoPromptInPriorityOrder(ctx = {}) {
  const { input = {}, scriptRow = {}, blueprint, identityBlock = '', sceneIndex = 0 } = ctx
  const profile = resolveStyleProfile(input)
  const seed = String(input.seedLine || input.theme || '').trim()
  const storyBlock = String(input.__masterStoryContextBlock || input.theme || '').trim().slice(0, 500)
  const sceneNum = Number(scriptRow.scene) > 0 ? Number(scriptRow.scene) : sceneIndex + 1
  const sceneDesc = String(
    scriptRow.visual_description || blueprint?.cinematicComposition || scriptRow.action || ''
  ).trim()
  const mood = String(scriptRow.mood || scriptRow.emotional_tone || blueprint?.emotion || '').trim()
  const where = String(
    scriptRow.environment ||
      scriptRow.location ||
      blueprint?.environment ||
      input.theme ||
      ''
  ).trim()
  const id = String(identityBlock || '').trim()

  const blocks = []
  if (seed) blocks.push(`USER PROMPT (highest priority): ${seed}.`)
  if (storyBlock) blocks.push(`STORY CONTEXT: ${storyBlock}.`)
  if (id) {
    blocks.push(`CHARACTER PROFILES (locked — inject every scene):\n${id}`)
  }
  blocks.push(
    [
      `SCENE ${sceneNum} — WHO: only cast from character profiles; no new faces.`,
      `WHAT IS HAPPENING: ${sceneDesc || 'single clear story beat with readable action'}.`,
      where ? `WHERE: ${where}.` : 'WHERE: environment matches story setting and architecture.',
      mood ? `EMOTIONAL ATMOSPHERE: ${mood}.` : 'EMOTIONAL ATMOSPHERE: matches story beat.',
      'ENVIRONMENTAL DETAILS: weather, surroundings, architecture, time of day as implied by story.',
      `VISUAL STORYTELLING: focal point on story action; camera ${String(scriptRow.camera || blueprint?.cameraAngle || 'motivated cinematic medium shot')}; lighting ${String(scriptRow.lighting || blueprint?.lightingStyle || 'motivated cinematic light')}.`
    ].join(' ')
  )
  blocks.push(`STYLE LOCK (apply last): ${profile.leonardoCore} ${profile.leonardoForbidden || ''}`.trim())

  let prompt = blocks.join('\n\n')
  prompt = enrichLeonardoPrompt(prompt, { input, scene: scriptRow, blueprint, identityBlock })
  return prompt.trim()
}

const SECTION_CHECKS = [
  { key: 'style', re: /STYLE LOCK|visual style lock|leonardoCore/i },
  { key: 'character', re: /CHARACTER (IDENTITY|CONSISTENCY)|SAME person|character profile/i },
  { key: 'scene', re: /SCENE \d|Staging:|Composition:|VISUAL BLUEPRINT/i },
  { key: 'environment', re: /Environment:|location|architecture|weather/i },
  { key: 'emotion', re: /Emotion|mood|Mood:/i },
  { key: 'camera', re: /Camera:|shot|framing|composition/i },
  { key: 'lighting', re: /Lighting:|sunlight|moonlight|ambient|volumetric/i },
  { key: 'story', re: /continuity|story genre|narrative|beat/i }
]

/**
 * Auto-enrich prompts missing required sections (deterministic).
 * @param {string} prompt
 * @param {object} ctx
 * @returns {string}
 */
export function enrichLeonardoPrompt(prompt, ctx = {}) {
  const p = String(prompt || '').trim()
  const { input = {}, scene = {}, blueprint, identityBlock = '' } = ctx
  const profile = resolveStyleProfile(input)
  const additions = []

  for (const { key, re } of SECTION_CHECKS) {
    if (!re.test(p)) {
      if (key === 'style') {
        additions.push(`${profile.leonardoCore} ${profile.leonardoForbidden}`)
      } else if (key === 'character' && identityBlock) {
        additions.push(String(identityBlock).trim())
      } else if (key === 'scene') {
        const n = Number(scene.scene) || blueprint?.sceneIndex || ''
        const visual = String(scene.visual_description || blueprint?.cinematicComposition || '').trim()
        additions.push(
          `Scene ${n} story beat: ${visual || 'single clear illustrated moment'}. Illustrate who is present, what they are doing, and the emotional focus.`
        )
      } else if (key === 'environment') {
        const env = String(
          scene.environment || scene.location || blueprint?.environment || input.theme || ''
        ).trim()
        if (env) additions.push(`Environment: ${env}.`)
      } else if (key === 'emotion') {
        const em = String(scene.mood || scene.emotional_tone || blueprint?.emotion || '').trim()
        additions.push(`Emotional mood: ${em || 'story-appropriate feeling'}.`)
      } else if (key === 'camera') {
        additions.push(
          `Camera: ${String(scene.camera || scene.camera_angle || blueprint?.cameraAngle || 'motivated medium shot with cinematic depth of field')}.`
        )
      } else if (key === 'lighting') {
        additions.push(
          `Lighting: ${String(scene.lighting || blueprint?.lightingStyle || 'motivated cinematic light with natural falloff')}.`
        )
      } else if (key === 'story') {
        additions.push(
          'Story context: cohesive serialized visuals — same cast identity, environment logic, and emotional arc as prior scenes.'
        )
      }
    }
  }

  additions.push(
    'Quality: highly detailed, professional artwork, cinematic composition, consistent character design, high-quality visual storytelling.'
  )

  if (!additions.length) return p
  return `${p} ${additions.join(' ')}`.trim()
}

/**
 * Full Leonardo scene prompt (blueprint-first + layers + enrichment).
 * @param {object} opts
 */
export function assembleLeonardoScenePrompt(opts = {}) {
  const {
    scriptRow,
    input = {},
    blueprint,
    identityBlock = '',
    script = [],
    sceneIndex = 0,
    leonardoPromptFromBlueprint,
    buildLeonardoScenePrompt
  } = opts

  const base = blueprint
    ? leonardoPromptFromBlueprint(blueprint, input, identityBlock)
    : buildLeonardoScenePrompt(scriptRow, input, identityBlock)

  const layers = mergeCharacterPromptLayers({
    input,
    characters: opts.characters || [],
    identityBlock,
    scriptRow,
    script,
    sceneIndex
  })

  let prompt = layers ? `${base} ${layers}` : base
  prompt = enrichLeonardoPrompt(prompt, {
    input,
    scene: scriptRow,
    blueprint,
    identityBlock
  })
  const compliance = auditLeonardoPromptCompliance(prompt, { input })
  if (!compliance.ok) {
    prompt = rebuildLeonardoPromptInPriorityOrder({
      input,
      scriptRow,
      blueprint,
      identityBlock,
      sceneIndex
    })
  }
  return prompt.trim()
}
