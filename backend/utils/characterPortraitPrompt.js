/**
 * Character portrait prompts — StoryBible DNA + strict style lock.
 */

import { resolveStyleProfile, strictStylePromptLine } from './visualStyleLock.js'
import { buildCharacterDNA, leonardoPromptsFromDNA } from '../cinematic/characterDNA.js'
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
  const prepared = leonardoPromptsFromDNA(dna, {
    input,
    emotion: 'neutral portrait expression',
    pose: 'waist-up portrait, face clearly visible',
    storyContext: character.baseImagePrompt || ''
  })
  return prepared.prompt
}
