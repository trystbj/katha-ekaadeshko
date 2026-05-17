/**
 * AI Narrator Voice Director — scene/story analysis → delivery plan + TTS instructions.
 * Delegates to global cinematic narration director (emotion, language, realism, dialogue).
 */

import { buildGlobalNarrationPlan } from './cinematicNarrationDirector.js'
import { buildVoiceProfile, summarizeVoiceProfileForBlueprint } from './voiceProfile.js'

/**
 * Full director context → voice profile.
 * @param {Record<string, unknown>} ctx
 */
export function analyzeVoiceProfile(ctx) {
  if (ctx?.autoVoiceDirector === false) {
    return buildVoiceProfile({ ...ctx, narratorGenderPreference: ctx.narratorGenderPreference || 'auto' })
  }
  return buildVoiceProfile(ctx)
}

/**
 * Per-scene voice direction for TTS + subtitles.
 * @param {Record<string, unknown>} ctx
 */
export function buildVoiceDirection(ctx) {
  const plan = buildGlobalNarrationPlan(ctx)
  return {
    profile: plan.profile,
    instructionSuffix: plan.instructionSuffix,
    speedMul: plan.speedMul,
    pauseBiasMs: plan.pauseBiasMs,
    emphasis: plan.emphasis,
    whisperBias: plan.whisperBias,
    subtitleRevealBias: plan.subtitleRevealBias,
    processedText: plan.processedText
  }
}

/**
 * Blueprint prose for LLM story/script generation.
 * @param {Record<string, unknown>} ctx
 */
export function voiceDirectorBlueprintSection(ctx) {
  if (ctx?.autoVoiceDirector === false) return ''
  const profile = analyzeVoiceProfile(ctx)
  return summarizeVoiceProfileForBlueprint(profile)
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string}
 */
export function buildSceneTtsInstructions(ctx) {
  const dir = buildVoiceDirection(ctx)
  return dir.instructionSuffix
}
