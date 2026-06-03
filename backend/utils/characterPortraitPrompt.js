/**
 * Character portrait prompts — StoryBible DNA + strict style lock.
 */

import { resolveStyleProfile, strictStylePromptLine } from './visualStyleLock.js'
import { characterDNAPromptBlock, buildCharacterDNA } from '../cinematic/characterDNA.js'
import { regionalAppearancePromptBlock } from '../cinematic/regionalAppearance.js'
import { prepareLeonardoApiPrompts } from './leonardoPromptOptimizer.js'

/**
 * @param {Record<string, unknown>} character
 * @param {object} input
 */
export function buildCharacterPortraitPromptFromDNA(character = {}, input = {}) {
  const profile = resolveStyleProfile(input)
  const style = strictStylePromptLine(profile)
  const dna = character.characterDNA || buildCharacterDNA(character, {
    country: input.country,
    theme: input.theme || input.seedLine
  })
  const dnaBlock = characterDNAPromptBlock(dna)
  const regional = regionalAppearancePromptBlock(dna.regionalAppearance || {})
  const parts = [
    `STYLE LOCK — highest authority: ${style}`,
    dnaBlock,
    regional,
    `CHARACTER PORTRAIT: ${dna.name} (${dna.gender}, ${dna.age}).`,
    `Wardrobe: ${dna.clothing}. Hair: ${dna.hairstyle}${dna.hairColor ? `, ${dna.hairColor}` : ''}.`,
    `Face: ${dna.faceShape}, ${dna.eyeShape}, eyes ${dna.eyeColor}, ${dna.skinTone}.`,
    `Role: ${dna.storyRole}. ${dna.personality}.`,
    character.baseImagePrompt || '',
    'Single character waist-up portrait, one person only, no text, no watermark, identity locked for all scenes.'
  ]
  return prepareLeonardoApiPrompts({
    prompt: parts.filter(Boolean).join(' '),
    negativePrompt: profile.leonardoForbidden || ''
  }).prompt
}
