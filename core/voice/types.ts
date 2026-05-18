/** Shared voice director types (renderer + future providers). */

export type VoiceAgeGroup = 'child' | 'teen' | 'young_adult' | 'adult' | 'elder' | 'timeless'

export type VoiceGenderRole =
  | 'male'
  | 'female'
  | 'child'
  | 'elder'
  | 'mythical'
  | 'dark_entity'
  | 'anime_hero'
  | 'anime_villain'
  | 'neutral'

export type VoiceEmotionStyle =
  | 'neutral'
  | 'warm'
  | 'tender'
  | 'suspense'
  | 'horror'
  | 'action'
  | 'comedy'
  | 'mystery'
  | 'fantasy'
  | 'epic'
  | 'noir'

export type VoicePacingStyle = 'calm' | 'moderate' | 'energetic' | 'suspense' | 'dramatic'

export type VoiceIntensityLevel = 'low' | 'medium' | 'high'

/** Auto-generated narration profile — provider-agnostic. */
export interface VoiceProfile {
  language: string
  gender: VoiceGenderRole
  ageGroup: VoiceAgeGroup
  emotionStyle: VoiceEmotionStyle
  cinematicStyle: string
  pacingStyle: VoicePacingStyle
  intensityLevel: VoiceIntensityLevel
  autoDetected: boolean
}

/** Per-scene delivery plan for TTS + subtitle timing. */
export interface VoiceDirection {
  instructionSuffix: string
  speedMul: number
  pauseBiasMs: number
  emphasis: 'low' | 'medium' | 'high'
  whisperBias: number
  subtitleRevealBias: number
  /** Preprocessed narration text for TTS (optional). */
  processedText?: string
}

/** Global cinematic narration plan (backend). */
export interface GlobalNarrationPlan extends VoiceDirection {
  profile: VoiceProfile
}

export interface VoiceDirectorContext {
  narration?: string
  visualDescription?: string
  genre?: string
  theme?: string
  storyTone?: string
  storyLanguage?: string
  styleId?: string
  customVisualPrompt?: string
  narratorId?: string
  narratorName?: string
  /** User story seed; UI/API allow up to 10_000 chars (see shared/storyIdeaLimits.js). */
  seedLine?: string
  characters?: Array<{ name?: string; personality?: string }>
  autoVoiceDirector?: boolean
  narratorGenderPreference?: string
}
