import type { VoiceAgeGroup, VoiceEmotionStyle, VoiceGenderRole, VoiceIntensityLevel, VoicePacingStyle, VoiceProfile } from '../../../../core/voice/types'
import { normalizeNarratorId } from '../constants/narrators'
import type { VisualStyleId } from '../types/story'

export type VoiceProfileContext = {
  storyLanguage?: string
  languageId?: string
  genre?: string
  theme?: string
  storyTone?: string
  styleId?: VisualStyleId | string
  customVisualPrompt?: string
  narratorId?: string
  narratorGenderPreference?: string
  seedLine?: string
  narration?: string
  narratorName?: string
}

function norm(s?: string) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
}

function baseLang(code?: string) {
  return norm(code).split(/[-_]/)[0] || 'en'
}

export function inferVoiceGender(ctx: VoiceProfileContext): VoiceGenderRole {
  const pref = norm(ctx.narratorGenderPreference)
  if (pref && pref !== 'auto') {
    const roles: VoiceGenderRole[] = [
      'male',
      'female',
      'child',
      'elder',
      'mythical',
      'dark_entity',
      'anime_hero',
      'anime_villain'
    ]
    if (roles.includes(pref as VoiceGenderRole)) return pref as VoiceGenderRole
  }

  const narratorId = normalizeNarratorId(ctx.narratorId)
  if (narratorId === 'penguin') return 'female'
  if (narratorId === 'tryst_bj') return 'male'

  const blob = [ctx.narration, ctx.seedLine, ctx.narratorName].filter(Boolean).join('\n').toLowerCase()
  if (/\b(demon|entity|void|eldritch)\b/.test(blob)) return 'dark_entity'
  if (/\b(hero|champion)\b/.test(blob) && /anime/.test(blob + norm(ctx.styleId))) return 'anime_hero'
  if (/\b(villain|antagonist)\b/.test(blob) && /anime/.test(blob + norm(ctx.styleId))) return 'anime_villain'
  if (/\b(goddess|spirit|oracle|fairy)\b/.test(blob)) return 'mythical'
  if (/\b(grandmother|grandfather|elder|sage)\b/.test(blob)) return 'elder'
  if (/\b(child|kid\b|young\s+boy|young\s+girl)\b/.test(blob)) return 'child'
  if (/\b(she\b|her\b|woman|girl\b|queen|princess)\b/.test(blob) && !/\b(he\b|his\b|king|prince)\b/.test(blob)) {
    return 'female'
  }
  if (/\b(he\b|his\b|king|prince|father)\b/.test(blob)) return 'male'
  return 'neutral'
}

export function buildVoiceProfile(ctx: VoiceProfileContext): VoiceProfile {
  const language = baseLang(ctx.storyLanguage || ctx.languageId)
  const genre = norm(ctx.genre)
  const storyTone = norm(ctx.storyTone)
  const styleId = norm(ctx.styleId) || 'soft_anime_fantasy'
  const customBlob = norm(ctx.customVisualPrompt)
  const blob = `${norm(ctx.narration)}\n${norm(ctx.seedLine)}\n${genre}\n${storyTone}`

  let emotionStyle: VoiceEmotionStyle = 'neutral'
  let pacingStyle: VoicePacingStyle = 'moderate'
  let intensityLevel: VoiceIntensityLevel = 'medium'

  if (storyTone === 'warm' || storyTone === 'tender') emotionStyle = 'tender'
  else if (storyTone === 'tense') emotionStyle = 'suspense'
  else if (storyTone === 'epic') emotionStyle = 'epic'
  else if (storyTone === 'whimsical') emotionStyle = 'comedy'
  else if (storyTone === 'noir') emotionStyle = 'noir'

  if (/horror|terror/.test(genre) || /\b(terror|nightmare)\b/.test(blob)) {
    emotionStyle = 'horror'
    pacingStyle = 'suspense'
    intensityLevel = 'high'
  } else if (/mystery|thriller/.test(genre)) {
    emotionStyle = 'mystery'
    pacingStyle = 'suspense'
  } else if (/comedy/.test(genre)) {
    emotionStyle = 'comedy'
    pacingStyle = 'energetic'
  } else if (/action|adventure/.test(genre)) {
    emotionStyle = 'action'
    pacingStyle = 'energetic'
    intensityLevel = 'high'
  } else if (/fantasy|myth/.test(genre)) {
    emotionStyle = 'fantasy'
    pacingStyle = 'dramatic'
  }

  const preset = stylePresetEmotion(styleId, customBlob)
  if (preset) {
    emotionStyle = preset.emotion
    pacingStyle = preset.pacing
    intensityLevel = preset.intensity
  }

  const gender = inferVoiceGender(ctx)
  const ageGroup = inferAgeGroup(gender, blob, styleId)

  return {
    language,
    gender,
    ageGroup,
    emotionStyle,
    cinematicStyle: styleId === 'custom' ? `custom:${customBlob.slice(0, 80)}` : styleId,
    pacingStyle,
    intensityLevel,
    autoDetected: !ctx.narratorGenderPreference || norm(ctx.narratorGenderPreference) === 'auto'
  }
}

function stylePresetEmotion(
  styleId: string,
  customBlob: string
): { emotion: VoiceEmotionStyle; pacing: VoicePacingStyle; intensity: VoiceIntensityLevel } | null {
  switch (styleId) {
    case 'cozy_storybook':
      return { emotion: 'warm', pacing: 'calm', intensity: 'low' }
    case 'soft_anime_fantasy':
      return { emotion: 'fantasy', pacing: 'calm', intensity: 'medium' }
    case 'cinematic_anime':
      return { emotion: 'epic', pacing: 'dramatic', intensity: 'high' }
    case 'dark_anime':
      return { emotion: 'suspense', pacing: 'suspense', intensity: 'high' }
    case 'comic_panel':
      return { emotion: 'comedy', pacing: 'energetic', intensity: 'medium' }
    case 'custom':
      if (/horror|dark|noir/.test(customBlob)) {
        return { emotion: 'horror', pacing: 'suspense', intensity: 'high' }
      }
      if (/cozy|warm|storybook/.test(customBlob)) {
        return { emotion: 'warm', pacing: 'calm', intensity: 'low' }
      }
      if (/comic|punchy/.test(customBlob)) {
        return { emotion: 'comedy', pacing: 'energetic', intensity: 'medium' }
      }
      return { emotion: 'neutral', pacing: 'moderate', intensity: 'medium' }
    default:
      return null
  }
}

function inferAgeGroup(gender: VoiceGenderRole, blob: string, styleId: string): VoiceAgeGroup {
  if (gender === 'child') return 'child'
  if (gender === 'elder' || gender === 'mythical') return 'elder'
  if (gender === 'anime_hero') return 'young_adult'
  if (/\b(teen|adolescent)\b/.test(blob)) return 'teen'
  if (/\b(old|ancient|wise)\b/.test(blob)) return 'elder'
  if (styleId === 'cinematic_anime') return 'young_adult'
  return 'adult'
}
