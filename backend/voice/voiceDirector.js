/**
 * AI Narrator Voice Director — scene/story analysis → delivery plan + TTS instructions.
 * Provider-agnostic; consumed by TTS registry and subtitle timing adapters.
 */

import { narrationSceneAdaptationInstructions } from '../utils/narrationSceneAdaptation.js'
import { buildVoiceProfile, summarizeVoiceProfileForBlueprint } from './voiceProfile.js'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function genderDeliveryHints(gender) {
  switch (gender) {
    case 'female':
      return 'Gender delivery: feminine narrator presence — agile emotional contour, clear highs without shrillness.'
    case 'male':
      return 'Gender delivery: masculine narrator presence — chest-forward authority, disciplined gravitas.'
    case 'child':
      return 'Gender delivery: youthful narrator — brighter onset, shorter phrases, playful innocence without cartoon exaggeration.'
    case 'elder':
      return 'Gender delivery: elder wisdom — slower measured cadence, soft authoritative landing.'
    case 'mythical':
      return 'Gender delivery: mythic otherworldly — spacious vowels, reverent pacing, ethereal restraint.'
    case 'dark_entity':
      return 'Gender delivery: dark entity — low resonance, controlled menace via timing not rasp overload.'
    case 'anime_hero':
      return 'Gender delivery: anime hero — disciplined optimism, forward resonance on stakes.'
    case 'anime_villain':
      return 'Gender delivery: anime villain — darker proximity, cynical softness, suspense spacing.'
    default:
      return ''
  }
}

function stylePresetDeliveryHints(styleId, customVisualPrompt) {
  const sid = String(styleId || '').trim()
  const custom = String(customVisualPrompt || '').toLowerCase()
  switch (sid) {
    case 'cozy_storybook':
      return 'Style preset: cozy storybook — warm gentle narration, calm pacing, storybook intimacy.'
    case 'soft_anime_fantasy':
      return 'Style preset: soft anime fantasy — warm emotional anime tone, gentle magical lift.'
    case 'cinematic_anime':
      return 'Style preset: cinematic anime — dramatic pauses, emotional intensity, anime-style cinematic peaks.'
    case 'dark_anime':
      return 'Style preset: dark anime — darker tone, suspense pacing, emotional heaviness, mysterious atmosphere.'
    case 'comic_panel':
      return 'Style preset: comic — energetic punchy timing, dynamic emphasis, playful clarity.'
    case 'custom':
      if (/horror|dark|noir/.test(custom)) return 'Custom style voice: darker suspense-forward narration matching user visual prompt.'
      if (/cozy|warm|storybook/.test(custom)) return 'Custom style voice: warm cozy narration matching user visual prompt.'
      if (/comic|punchy/.test(custom)) return 'Custom style voice: energetic comic timing matching user visual prompt.'
      return 'Custom style voice: mirror user visual prompt mood, lighting, and atmosphere in delivery.'
    default:
      return ''
  }
}

function emotionSpeedAndPause(profile, blob) {
  let speedMul = 1
  let pauseBiasMs = 180
  let emphasis = 'medium'
  let whisperBias = 0
  let subtitleRevealBias = 1

  switch (profile.pacingStyle) {
    case 'calm':
      speedMul *= 0.96
      pauseBiasMs += 40
      break
    case 'energetic':
      speedMul *= 1.04
      pauseBiasMs -= 25
      emphasis = 'high'
      break
    case 'suspense':
      speedMul *= 0.95
      pauseBiasMs += 55
      whisperBias = 0.15
      subtitleRevealBias = 0.92
      break
    case 'dramatic':
      speedMul *= 0.98
      pauseBiasMs += 35
      emphasis = 'high'
      subtitleRevealBias = 0.9
      break
    default:
      break
  }

  switch (profile.emotionStyle) {
    case 'horror':
      speedMul *= 0.94
      pauseBiasMs += 30
      whisperBias = 0.22
      break
    case 'comedy':
      speedMul *= 1.03
      pauseBiasMs -= 15
      break
    case 'action':
      speedMul *= 1.025
      emphasis = 'high'
      break
    case 'tender':
    case 'warm':
      speedMul *= 0.97
      pauseBiasMs += 20
      break
    case 'mystery':
      pauseBiasMs += 45
      whisperBias = 0.12
      subtitleRevealBias = 0.88
      break
    case 'epic':
      pauseBiasMs += 25
      emphasis = 'high'
      break
    default:
      break
  }

  if (profile.intensityLevel === 'high') emphasis = 'high'
  if (profile.intensityLevel === 'low') {
    speedMul *= 0.98
    pauseBiasMs += 15
  }

  if (/\b(whisper|hush|silence|secret)\b/i.test(blob)) whisperBias = Math.max(whisperBias, 0.2)
  if (/\b(reveal|suddenly|gasp|shock)\b/i.test(blob)) {
    pauseBiasMs += 30
    subtitleRevealBias = 0.85
  }

  return {
    speedMul: clamp(speedMul, 0.82, 1.14),
    pauseBiasMs: clamp(pauseBiasMs, 80, 320),
    emphasis,
    whisperBias: clamp(whisperBias, 0, 0.35),
    subtitleRevealBias: clamp(subtitleRevealBias, 0.75, 1.1)
  }
}

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
  const profile = analyzeVoiceProfile(ctx)
  const blob = `${ctx?.narration || ''}\n${ctx?.visualDescription || ''}`.toLowerCase()

  const sceneAdapt =
    ctx?.autoVoiceDirector === false
      ? ''
      : narrationSceneAdaptationInstructions({
          narration: ctx?.narration,
          visualDescription: ctx?.visualDescription,
          genre: ctx?.genre,
          theme: ctx?.theme,
          storyTone: ctx?.storyTone,
          storyLanguage: ctx?.storyLanguage || profile.language
        })

  const profileHints = [
    genderDeliveryHints(profile.gender),
    stylePresetDeliveryHints(ctx?.styleId, ctx?.customVisualPrompt),
    `Language rhythm lock: primary ${profile.language} — natural prosody and cultural pacing.`
  ].filter(Boolean)

  const dynamics = emotionSpeedAndPause(profile, blob)

  const instructionSuffix = [profileHints.join(' '), sceneAdapt].filter(Boolean).join(' ').trim()

  return {
    profile,
    instructionSuffix,
    speedMul: dynamics.speedMul,
    pauseBiasMs: dynamics.pauseBiasMs,
    emphasis: dynamics.emphasis,
    whisperBias: dynamics.whisperBias,
    subtitleRevealBias: dynamics.subtitleRevealBias
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
