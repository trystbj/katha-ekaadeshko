/**
 * Authoritative narrator → OpenAI TTS mapping (gpt-4o-mini-tts).
 * Canonical IDs: `tryst_bj` (Tryst BJ), `penguin` (Penguin).
 * Legacy IDs from older saves map via `normalizeNarratorId`.
 */

/** @typedef {{ id: string, gender: string, openAiVoice: string, speed: number, instructions: string }} NarratorSynthPreset */

const LEGACY_TO_CANONICAL = Object.freeze({
  m1_deep: 'tryst_bj',
  m2_crisp: 'tryst_bj',
  m3_calm: 'tryst_bj',
  f1_warm_clear: 'penguin',
  f2_bright: 'penguin',
  f3_soft_story: 'penguin'
})

/** @param {unknown} raw */
export function normalizeNarratorId(raw) {
  const id = typeof raw === 'string' ? raw.trim() : ''
  if (!id) return 'tryst_bj'
  if (id === 'tryst_bj' || id === 'penguin') return id
  return LEGACY_TO_CANONICAL[id] || 'tryst_bj'
}

/** @type {NarratorSynthPreset[]} */
export const NARRATOR_PRESETS = [
  {
    id: 'tryst_bj',
    gender: 'male',
    openAiVoice: 'onyx',
    speed: 0.88,
    instructions: [
      'Voice identity: mature male cinematic narrator—NOT interchangeable with other presets.',
      'Register: low chest resonance with controlled subharmonic weight; never nasal or thin.',
      'Pitch contour: anchor mid-low; narrow polite rises at clause ends, steep drops into gravitas on revelations.',
      'Cadence: slow–moderate, deliberate mythic pacing—each phrase lands like a weighted sentence.',
      'Speed & rhythm: slightly slower than conversational default; honor commas with 180–240 ms breath gaps.',
      'Texture: velvet-dark with occasional gravel on tension words only.',
      'Dynamics: wide cinematic range—near-whisper on suspense, measured swell on stakes, never shouty.',
      'Storytelling style: immersive blockbuster documentary hybrid—authority without shouting.',
      'Dramatic intensity: high but disciplined—save peaks for 1–2 emphasized words per sentence.',
      'Emotional expression: restrained empathy; sadness as lowered pitch + softer airflow, not whimper.',
      'Resonance: forward chest + soft palate warmth; avoid bright head resonance.',
      'Articulation: crisp consonants despite depth—every ending consonant audible.'
    ].join(' ')
  },
  {
    id: 'penguin',
    gender: 'female',
    openAiVoice: 'shimmer',
    speed: 1.06,
    instructions: [
      'Voice identity: youthful female expressive narrator—bright agile timbre, distinct from coral alto warmth.',
      'Register: medium-high female—light agile brightness, never harsh.',
      'Pitch contour: playful agile lifts; quick emotional pivots allowed.',
      'Cadence: upbeat storytelling with rhythmic bounce—still intelligible, not sing-song.',
      'Speed & rhythm: slightly quicker clause turnover; sparkle on humor beats.',
      'Texture: crisp airy sparkle with clean onset.',
      'Dynamics: wider playful swings acceptable—surprise pops, giggly softness.',
      'Storytelling style: energetic serialized YA energy meets sincere drama.',
      'Dramatic intensity: medium-high via tempo + pitch variance.',
      'Emotional expression: big-hearted—wonder widens vowels, empathy softens fricatives.',
      'Resonance: light head-forward clarity with youthful warmth.',
      'Articulation: crisp playful consonants; punch tag words cleanly.'
    ].join(' ')
  }
]

export const NARRATOR_IDS = NARRATOR_PRESETS.map((p) => p.id)

export function getNarratorPreset(narratorId) {
  const canon = normalizeNarratorId(narratorId)
  const found = NARRATOR_PRESETS.find((p) => p.id === canon)
  return found || NARRATOR_PRESETS[0]
}

/**
 * Internal voice profile (logging / future engines).
 * @param {string} narratorId
 */
export function getNarratorVoiceProfile(narratorId) {
  const p = getNarratorPreset(narratorId)
  const profiles = {
    tryst_bj: {
      pitchRegister: 'low chest',
      cadence: 'slow mythic',
      texture: 'velvet-dark selective gravel',
      resonance: 'forward chest',
      storytellingStyle: 'cinematic immersive',
      dramaticIntensity: 'high disciplined',
      emotionWeight: 0.72,
      styleWeight: 0.78,
      pauseBiasMs: 210
    },
    penguin: {
      pitchRegister: 'medium-high agile',
      cadence: 'upbeat rhythmic',
      texture: 'airy crisp sparkle',
      resonance: 'head-forward youthful warmth',
      storytellingStyle: 'serialized expressive YA',
      dramaticIntensity: 'medium-high pitch-tempo',
      emotionWeight: 0.74,
      styleWeight: 0.72,
      pauseBiasMs: 115
    }
  }
  const meta = profiles[p.id] || profiles.tryst_bj
  return {
    id: p.id,
    gender: p.gender,
    voiceModel: 'gpt-4o-mini-tts',
    openAiVoice: p.openAiVoice,
    speed: p.speed,
    instructions: p.instructions,
    ...meta
  }
}
