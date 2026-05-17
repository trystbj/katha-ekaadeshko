/**
 * Global cinematic narration director — orchestrates emotion, language, realism, dialogue, scene adaptation.
 */

import { narrationSceneAdaptationInstructions } from '../utils/narrationSceneAdaptation.js'
import { analyzeSceneEmotion } from './emotionNarrationEngine.js'
import { analyzeDialogueInNarration } from './dialogueNarrationHints.js'
import { humanSpeechRealismBlock } from './humanSpeechRealism.js'
import { getLanguageDeliveryBlock } from './languageDeliveryProfiles.js'
import { preprocessNarrationForTts } from './pronunciationPreprocessor.js'
import { buildVoiceProfile } from './voiceProfile.js'
import { normalizeNarratorId } from '../utils/narratorVoiceEngine.js'
import {
  isNepaliLanguage,
  nepaliDeliveryInstructionBlock,
  nepaliDialogueFlowHints,
  nepaliStoryRhythmBlock
} from './nepaliPronunciationEngine.js'

function genderFromCanonicalNarrator(narratorId) {
  const id = normalizeNarratorId(narratorId)
  return id === 'penguin' ? 'female' : 'male'
}

function genderDeliveryHints(gender) {
  switch (gender) {
    case 'female':
      return 'Personality: sweet warm feminine storyteller — soft expressive delivery, cozy cinematic intimacy, never deep or husky.'
    case 'male':
      return 'Personality: cinematic warm MALE storyteller — unmistakably masculine adult voice, calm confident immersion, natural mid baritone, not female timbre.'
    case 'child':
      return 'Personality: youthful narrator — brighter onset, playful innocence without cartoon exaggeration.'
    case 'elder':
      return 'Personality: elder wisdom — measured cadence, soft authoritative landing.'
    default:
      return ''
  }
}

function stylePresetDeliveryHints(styleId, customVisualPrompt) {
  const sid = String(styleId || '').trim()
  const custom = String(customVisualPrompt || '').toLowerCase()
  switch (sid) {
    case 'cozy_storybook':
      return 'Style: cozy storybook — warm gentle narration, calm pacing, storybook intimacy.'
    case 'soft_anime_fantasy':
      return 'Style: soft anime fantasy — warm emotional tone, gentle magical lift.'
    case 'cinematic_anime':
      return 'Style: cinematic anime — dramatic pauses, emotional peaks, directed suspense timing.'
    case 'dark_anime':
      return 'Style: dark anime — suspense pacing, emotional heaviness, mysterious atmosphere.'
    case 'comic_panel':
      return 'Style: comic — energetic punchy timing, dynamic emphasis.'
    case 'custom':
      if (/horror|dark|noir/.test(custom)) return 'Custom style: darker suspense-forward narration.'
      if (/cozy|warm|storybook/.test(custom)) return 'Custom style: warm cozy narration.'
      if (/comic|punchy/.test(custom)) return 'Custom style: energetic comic timing.'
      return 'Custom style: mirror user visual mood in vocal delivery.'
    default:
      return ''
  }
}

function cinematicTimingHints(emotion) {
  const parts = [
    'Cinematic director: manage suspense pauses, climax buildup, calm-scene softness, and smooth emotional transitions like an animated film narrator.'
  ]
  if (emotion.cinematicIntensity > 0.55) {
    parts.push('High cinematic intensity: dynamic pacing variation — tighten on tension, open on wonder.')
  }
  if (emotion.whisperBias > 0.12) {
    parts.push('Suspense timing: meaningful silence before reveals; emotional silence is part of the performance.')
  }
  return parts.join(' ')
}

/**
 * Full global narration plan for TTS synthesis or preview.
 * @param {Record<string, unknown>} ctx
 * @param {{ extendedPreview?: boolean, skipSceneAdapt?: boolean }} [opts]
 */
export function buildGlobalNarrationPlan(ctx, opts = {}) {
  const autoDirector = ctx?.autoVoiceDirector !== false
  const profile = buildVoiceProfile(ctx)
  if (ctx?.narratorId) {
    profile.gender = genderFromCanonicalNarrator(ctx.narratorId)
  }
  const storyLanguage = ctx?.storyLanguage || profile.language

  const emotion = analyzeSceneEmotion(ctx, profile)
  const preprocessed = preprocessNarrationForTts(ctx?.narration || '', storyLanguage)
  const dialogue = analyzeDialogueInNarration(preprocessed.text || ctx?.narration)

  const languageBlock = getLanguageDeliveryBlock(storyLanguage, {
    extendedPreview: Boolean(opts.extendedPreview)
  })

  const sceneAdapt =
    autoDirector && !opts.skipSceneAdapt
      ? narrationSceneAdaptationInstructions({
          narration: ctx?.narration,
          visualDescription: ctx?.visualDescription,
          genre: ctx?.genre,
          theme: ctx?.theme,
          storyTone: ctx?.storyTone,
          storyLanguage
        })
      : ''

  const nepaliRhythm = isNe ? nepaliStoryRhythmBlock(ctx, emotion) : ''
  const nepaliDialogue = isNe ? nepaliDialogueFlowHints(preprocessed.text || ctx?.narration) : ''

  const instructionParts = [
    genderDeliveryHints(profile.gender),
    stylePresetDeliveryHints(ctx?.styleId, ctx?.customVisualPrompt),
    languageBlock,
    humanSpeechRealismBlock(ctx, emotion),
    cinematicTimingHints(emotion),
    nepaliRhythm,
    ...emotion.instructionParts,
    dialogue.instruction,
    nepaliDialogue,
    preprocessed.hints,
    sceneAdapt
  ].filter(Boolean)

  const instructionSuffix = instructionParts.join(' ').replace(/\s+/g, ' ').trim()

  return {
    profile,
    emotion,
    instructionSuffix,
    processedText: preprocessed.text,
    speedMul: emotion.speedMul,
    pauseBiasMs: emotion.pauseBiasMs,
    emphasis: emotion.emphasis,
    whisperBias: emotion.whisperBias,
    subtitleRevealBias: emotion.subtitleRevealBias
  }
}
