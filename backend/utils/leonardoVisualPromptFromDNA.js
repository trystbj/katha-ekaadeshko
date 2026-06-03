/**
 * CharacterDNA → detailed Leonardo visual instruction set.
 */

import { regionalAppearancePromptBlock } from '../cinematic/regionalAppearance.js'
import { outfitLockPromptBlock } from '../cinematic/outfitLock.js'
import { prepareLeonardoApiPrompts } from './leonardoPromptOptimizer.js'
import { strictStylePromptLine, resolveStyleProfile } from './visualStyleLock.js'

/**
 * @param {object} dna — CharacterDNA
 * @param {object} [opts]
 */
export function buildLeonardoVisualPromptFromDNA(dna = {}, opts = {}) {
  const input = opts.input || {}
  const profile = resolveStyleProfile(input)
  const style = strictStylePromptLine(profile)
  const scriptRow = opts.scriptRow || {}
  const emotion = String(
    opts.emotion || scriptRow.mood || scriptRow.emotional_tone || dna.emotionalTraits || 'story-true'
  ).trim()
  const pose = String(opts.pose || scriptRow.action || 'natural story pose, readable gesture').trim()
  const env = String(
    opts.environment || scriptRow.environment || scriptRow.location || input.theme || ''
  ).trim()
  const camera = String(opts.camera || scriptRow.camera || scriptRow.camera_angle || 'cinematic medium shot')
  const lighting = String(opts.lighting || scriptRow.lighting || 'motivated cinematic light')

  const sections = [
    `SELECTED STYLE (highest authority): ${style}.`,
    `CHARACTER IDENTITY: ${dna.name}; role ${dna.storyRole || 'lead'}; occupation ${dna.occupation || 'story character'}.`,
    `PHYSICAL APPEARANCE: ${dna.gender}, age ${dna.age}, ${dna.bodyType}, height ${dna.height}, ${dna.skinTone}.`,
    `FACIAL DETAILS: ${dna.facialStructure || dna.faceShape}, ${dna.eyeShape}, eyes ${dna.eyeColor}.`,
    `HAIR DETAILS: ${dna.hairstyle}${dna.hairColor ? `, color ${dna.hairColor}` : ''}.`,
    `CLOTHING DETAILS: ${dna.clothing}; colors ${dna.outfitLock?.colors || 'locked palette'}.`,
    `ACCESSORIES: ${dna.accessories}.`,
    regionalAppearancePromptBlock(dna.regionalAppearance || {}),
    outfitLockPromptBlock(dna.outfitLock, scriptRow),
    `REGIONAL FEATURES: ${dna.regionalOrigin || dna.ethnicity}; ${dna.ethnicity}; no unrelated Western/East Asian default faces.`,
    `PERSONALITY / EMOTION: ${dna.personality}; emotional traits ${dna.emotionalTraits || ''}; scene emotion ${emotion}.`,
    `VISUAL DISTINGUISHING FEATURES: ${dna.visualDistinguishingFeatures || dna.visualIdentity || ''}.`,
    `POSE: ${pose}.`,
    `LIGHTING: ${lighting}.`,
    `CAMERA: ${camera}; composition focal on character action.`,
    env ? `ENVIRONMENT (supporting): ${env}.` : '',
    opts.storyContext ? `STORY CONTEXT: ${String(opts.storyContext).slice(0, 200)}.` : '',
    'Single coherent frame, no text, no watermark, no collage.'
  ]

  const negative = [
    profile.leonardoForbidden || '',
    'wrong age, wrong gender, wrong ethnicity, random face, random hair, random outfit swap,',
    'western default when story is regional, duplicate faces, extra people unless script requires'
  ]
    .filter(Boolean)
    .join(' ')

  return prepareLeonardoApiPrompts({
    prompt: sections.filter(Boolean).join(' '),
    negativePrompt: negative
  })
}
