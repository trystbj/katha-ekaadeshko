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
    ageProfile: 'young_adult',
    voiceDepth: 'medium',
    pitchRange: 'mid',
    resonance: 'balanced',
    breathTexture: 'clean',
    narrationCadence: 'conversational',
    accentProfile: 'nepali_native',
    storytellingStyle: 'natural warm male host; engaging cinematic clarity',
    emotionalRange: 'balanced',
    cinematicIntensity: 'medium',
    whisperProfile: 'soft intimate hush; still clear and masculine',
    shoutingProfile: 'never shout; energy via brightness and pace',
    calmProfile: 'relaxed natural warmth; easy listening flow',
    suspenseProfile: 'gentle tension; slightly quicker pace, not gravel drag',
    epicProfile: 'lifted enthusiasm on stakes; still natural not booming',
    browserTts: { rate: 1.0, pitch: 0.96 }
  },
  penguin: {
    id: 'penguin',
    gender: 'female',
    ageProfile: 'young_adult',
    voiceDepth: 'light',
    pitchRange: 'mid',
    resonance: 'mask',
    breathTexture: 'silky',
    narrationCadence: 'conversational',
    accentProfile: 'nepali_native',
    storytellingStyle: 'sweet warm feminine narrator; gentle melodic care',
    emotionalRange: 'balanced',
    cinematicIntensity: 'medium',
    whisperProfile: 'soft breathy whisper; tender and feminine',
    shoutingProfile: 'avoid harshness; warm bright emphasis only',
    calmProfile: 'honeyed softness; caring unhurried flow',
    suspenseProfile: 'delicate hush with feminine musicality',
    epicProfile: 'warm wonder; sweet lift without squeaky energy',
    browserTts: { rate: 1.02, pitch: 1.16 }
  }
}

export function narratorIdentityForId(raw: string): NarratorVoiceIdentity {
  const id = normalizeNarratorId(raw) as NarratorVoiceIdentity['id']
  return NARRATOR_VOICE_IDENTITIES[id] ?? NARRATOR_VOICE_IDENTITIES.tryst_bj
}
