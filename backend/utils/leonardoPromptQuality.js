/**
 * Leonardo prompt enrichment, validation, negatives, and scene continuity.
 * Used by leonardoService and regeneration — no UI or pipeline stage changes.
 */

import { resolveStyleProfile } from './visualStyleLock.js'
import { TEXT_FREE_NEGATIVE } from '../cinematic/masterStoryContext.js'
import {
  buildCharacterIdentityMemory,
  leonardoIdentityBlockForScriptRow
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
  return prompt.trim()
}
