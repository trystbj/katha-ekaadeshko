import { normalizeNarratorId } from './narrators'

export type NarratorVoiceIdentity = {
  /** Canonical narrator id */
  id: 'tryst_bj' | 'penguin'
  gender: 'male' | 'female'
  ageProfile: 'teen' | 'young_adult' | 'adult' | 'mature'
  voiceDepth: 'light' | 'medium' | 'deep'
  pitchRange: 'low' | 'mid' | 'high' | 'wide'
  resonance: 'chest' | 'balanced' | 'mask' | 'head'
  breathTexture: 'clean' | 'silky' | 'velvet' | 'airy' | 'grainy'
  narrationCadence: 'slow_mythic' | 'oral_tradition' | 'conversational' | 'broadcast' | 'upbeat_rhythmic'
  accentProfile: 'nepali_native' | 'south_asian_general'
  storytellingStyle: string
  emotionalRange: 'restrained' | 'balanced' | 'wide'
  cinematicIntensity: 'low' | 'medium' | 'high'
  whisperProfile: string
  shoutingProfile: string
  calmProfile: string
  suspenseProfile: string
  epicProfile?: string
  warmthSoftnessProfile?: string
  browserTts: { rate: number; pitch: number }
}

export const NARRATOR_VOICE_IDENTITIES: Record<NarratorVoiceIdentity['id'], NarratorVoiceIdentity> = {
  tryst_bj: {
    id: 'tryst_bj',
    gender: 'male',
    ageProfile: 'adult',
    voiceDepth: 'deep',
    pitchRange: 'low',
    resonance: 'chest',
    breathTexture: 'velvet',
    narrationCadence: 'slow_mythic',
    accentProfile: 'nepali_native',
    storytellingStyle: 'cinematic authority, mythic pacing, disciplined intensity',
    emotionalRange: 'restrained',
    cinematicIntensity: 'high',
    whisperProfile: 'near-whisper suspense with controlled breath; never thin',
    shoutingProfile: 'never shout; intensity via weight + timing',
    calmProfile: 'slow grounded gravitas; firm clause landings',
    suspenseProfile: 'hushed, tighter pitch contour, longer pauses on reveals',
    epicProfile: 'measured swell on stakes; chest-forward resonance; controlled peaks',
    browserTts: { rate: 0.88, pitch: 0.85 }
  },
  penguin: {
    id: 'penguin',
    gender: 'female',
    ageProfile: 'teen',
    voiceDepth: 'light',
    pitchRange: 'wide',
    resonance: 'head',
    breathTexture: 'airy',
    narrationCadence: 'upbeat_rhythmic',
    accentProfile: 'south_asian_general',
    storytellingStyle: 'youthful expressive narrator; agile; energetic serialized feel',
    emotionalRange: 'wide',
    cinematicIntensity: 'medium',
    whisperProfile: 'playful whisper; crisp onset remains',
    shoutingProfile: 'avoid harshness; surprise pops only',
    calmProfile: 'soft bright warmth; quick emotional pivots',
    suspenseProfile: 'tempo + pitch variance create tension; readable rhythm',
    epicProfile: 'YA epic energy through tempo; avoid trailer-boom',
    browserTts: { rate: 1.06, pitch: 1.18 }
  }
}

export function narratorIdentityForId(raw: string): NarratorVoiceIdentity {
  const id = normalizeNarratorId(raw) as NarratorVoiceIdentity['id']
  return NARRATOR_VOICE_IDENTITIES[id] ?? NARRATOR_VOICE_IDENTITIES.tryst_bj
}
