/**
 * Mandatory pipeline gates — story → cast → visuals (no skipped steps).
 */

import { assertCharactersReadyForImageGeneration } from '../character/characterIdentityMemory.js'
import { buildStoryBible } from './storyBible.js'

/**
 * @param {object} story
 * @param {Record<string, unknown>[]} script
 * @param {object} input
 */
export function validateStoryForVisualPipeline(story, script = [], input = {}) {
  const issues = []
  if (!story || typeof story !== 'object') issues.push('missing_story')
  if (!Array.isArray(script) || !script.length) issues.push('missing_script')
  const cast = Array.isArray(story?.characters) ? story.characters : []
  if (!cast.length) issues.push('missing_characters')
  if (!String(input.styleId || '').trim() && !input.customVisualPrompt) {
    issues.push('missing_style')
  }
  if (issues.length) {
    throw new Error(`Story validation failed before visuals: ${issues.join(', ')}`)
  }
  return assertCharactersReadyForImageGeneration(cast, {
    country: input.country,
    theme: input.theme || input.seedLine
  })
}

/**
 * @param {object} story
 * @param {object} input
 * @param {Record<string, unknown>[]} script
 * @param {string} region
 */
export function buildValidatedStoryBible(story, input, script, region = '') {
  const cast = validateStoryForVisualPipeline(story, script, input)
  story.characters = cast
  return buildStoryBible(story, input, script, region)
}
