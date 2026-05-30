/**
 * Per-scene cinematic visual blueprint — Leonardo must illustrate THIS, not raw story prose alone.
 */

import { resolveStyleProfile } from '../../utils/visualStyleLock.js'
import { continuityBlockForScene } from '../continuity/smartContinuityEngine.js'
import { leonardoIdentityBlockForScriptRow } from '../../character/characterIdentityMemory.js'
import { TEXT_FREE_NEGATIVE } from '../../cinematic/masterStoryContext.js'
import { imagePromptEnglishLockLine } from '../../../shared/outputLanguageLock.js'

/**
 * @typedef {object} SceneVisualBlueprint
 * @property {number} sceneIndex
 * @property {string} sceneMood
 * @property {string} environment
 * @property {string} cameraAngle
 * @property {string} lightingStyle
 * @property {string} weather
 * @property {string} characterPlacement
 * @property {string} emotion
 * @property {string} cinematicComposition
 * @property {string} visualStyle
 * @property {string} continuityReference
 * @property {string} motionIntent
 * @property {string} [negativePrompt]
 * @property {string} [directorNote]
 */

function sceneNumFromRow(row, index) {
  const n = Number(row?.scene)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : index + 1
}

function seedGuardrails(seedBlob = '') {
  const blob = String(seedBlob).toLowerCase()
  const forbidden = [
    TEXT_FREE_NEGATIVE,
    'readable text',
    'subtitles',
    'scene scripts',
    'narration text',
    'captions',
    'watermarks',
    'logos',
    'UI overlay',
    'interface elements',
    'split screen collage',
    'duplicate panels',
    'malformed faces',
    'duplicate characters',
    'unrelated scenery'
  ]
  if (/\b(nordic|scandinavian|forest creature|gentle white|snow forest|frost)\b/.test(blob)) {
    forbidden.push(
      'random cartoon children',
      'unrelated suburban kids',
      'modern city street',
      'bright gag comedy faces',
      'inconsistent fantasy species'
    )
  }
  if (/\b(cozy|emotional|gentle)\b/.test(blob)) {
    forbidden.push('horror gore', 'harsh neon nightclub', 'chaotic crowd chaos')
  }
  return forbidden.join(', ')
}

/**
 * Build structured blueprint from script row + director context (deterministic; fast).
 * @param {Record<string, unknown>} row
 * @param {object} input normalized pipeline input
 * @param {object} ctx
 * @returns {SceneVisualBlueprint}
 */
export function buildSceneVisualBlueprint(row, input = {}, ctx = {}) {
  const index = Number(ctx.index) || 0
  const sceneIndex = sceneNumFromRow(row, index)
  const profile = resolveStyleProfile(input)
  const directives = ctx.directives || input.__productionDirectives || {}
  const pack = ctx.continuityPack
  const continuityReference = pack
    ? continuityBlockForScene(pack, sceneIndex)
    : String(ctx.continuityBlock || '').trim()

  const seedBlob = [input.seedLine, input.theme, input.customVisualPrompt, directives.directorNotes]
    .filter(Boolean)
    .join(' ')

  const environment = String(
    row.environment || row.location || row.setting || ''
  ).trim()
  const visual = String(row.visual_description || '').trim()
  const chars = Array.isArray(row.characters_in_shot)
    ? row.characters_in_shot.map((c) => String(c).trim()).filter(Boolean).join(', ')
    : ''

  return {
    sceneIndex,
    sceneMood: String(row.mood || row.emotional_tone || directives.sceneMood || directives.emotion || '').trim(),
    environment: environment || visual.slice(0, 120),
    cameraAngle: String(row.camera || row.camera_angle || directives.cameraStyle || '').trim(),
    lightingStyle: String(row.lighting || directives.lightingStyle || 'motivated cinematic light').trim(),
    weather: String(row.weather || '').trim(),
    characterPlacement: chars || 'cast from CHARACTER IDENTITY LOCK only — no new faces',
    emotion: String(row.emotional_tone || row.mood || directives.emotion || '').trim(),
    cinematicComposition: visual || 'single clear story beat, one location, readable hero subject',
    visualStyle: String(directives.visualStyle || profile.shortLabel || profile.key).trim(),
    continuityReference,
    motionIntent: String(row.camera_direction || row.action || directives.motionIntensity || '').trim(),
    negativePrompt: seedGuardrails(seedBlob),
    directorNote: String(directives.directorNotes || '').trim().slice(0, 400)
  }
}

/**
 * @param {Record<string, unknown>[]} script
 * @param {object} input
 * @param {object} ctx
 * @returns {SceneVisualBlueprint[]}
 */
export function buildAllSceneVisualBlueprints(script, input = {}, ctx = {}) {
  const rows = Array.isArray(script) ? script : []
  const castMemory = ctx.castMemory
  return rows.map((row, i) => {
    const bp = buildSceneVisualBlueprint(row, input, { ...ctx, index: i })
    if (castMemory?.length) {
      const idBlock = leonardoIdentityBlockForScriptRow(row, castMemory)
      if (idBlock) {
        bp.characterPlacement = `${bp.characterPlacement}. ${idBlock}`.trim()
      }
    }
    return bp
  })
}

/**
 * Leonardo-ready prompt from blueprint (not from raw story paragraph).
 * @param {SceneVisualBlueprint} bp
 * @param {object} input
 * @param {string} [identityBlock]
 */
export function leonardoPromptFromBlueprint(bp, input = {}, identityBlock = '') {
  const profile = resolveStyleProfile(input)
  const vertical = input.aspectMode !== 'horizontal_16_9'
  const framing = vertical
    ? 'vertical 9:16 portrait composition, tall readable framing, hero subject centered'
    : 'horizontal 16:9 widescreen composition, cinematic letter-safe framing'

  const hybrid = profile.key?.includes('+')
  const core = hybrid
    ? `${profile.leonardoCore} HYBRID — blend deliberately while staying cohesive.`
    : `${profile.leonardoCore} ${profile.leonardoForbidden}`

  const cref = String(input.__characterReferencePrompt || '').trim()
  const masterBlock = String(input.__masterStoryContextBlock || '').trim()
  const genre = String(input.genre || '').slice(0, 100)

  return [
    imagePromptEnglishLockLine(),
    core,
    `VISUAL BLUEPRINT SCENE ${bp.sceneIndex} (illustrate ONLY this plan):`,
    `Mood: ${bp.sceneMood || 'cinematic emotional'}.`,
    `Environment: ${bp.environment}.`,
    `Composition: ${bp.cinematicComposition}.`,
    `Characters in frame: ${bp.characterPlacement}.`,
    `Emotion: ${bp.emotion}.`,
    `Camera: ${bp.cameraAngle || 'motivated medium shot'}.`,
    `Lighting: ${bp.lightingStyle}.`,
    bp.weather ? `Weather: ${bp.weather}.` : '',
    `Visual style lock: ${bp.visualStyle}.`,
    bp.continuityReference ? `Continuity: ${bp.continuityReference}` : '',
    bp.motionIntent ? `Motion intent: ${bp.motionIntent}.` : '',
    identityBlock ? String(identityBlock).trim() : '',
    masterBlock,
    cref,
    `Genre atmosphere (do not change render medium): ${genre}.`,
    framing,
    'Same exact character from previous scenes — identical face, hair, clothing, skin tone, and age.',
    'Single illustrated frame — no comic panels, no duplicate thumbnails, no text, no subtitles, no captions, no watermark, no UI, no words.',
    bp.negativePrompt ? `FORBIDDEN: ${bp.negativePrompt}.` : '',
    bp.directorNote ? `Director: ${bp.directorNote}` : ''
  ]
    .filter(Boolean)
    .join(' ')
}
