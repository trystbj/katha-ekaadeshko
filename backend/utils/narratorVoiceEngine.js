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
    openAiVoice: 'ash',
    speed: 0.98,
    instructions: [
      'Voice identity: adult masculine Nepali male katha host—clearly male, Kathmandu बोलचाल; never female, never androgynous, never Hindi-film heroine tone.',
      'Register: natural mid male baritone—relaxed chest warmth; never artificially bass-heavy or sluggish.',
      'Pitch contour: conversational mid range with gentle rises; avoid monotone grave drops.',
      'Cadence: natural storytelling pace—fluid and listenable, like a skilled host, not a slow mythic documentary.',
      'Speed & rhythm: near-normal conversational speed; light pauses at commas only; keep momentum through sentences.',
      'Texture: smooth clear warmth with subtle smile in the tone; minimal gravel.',
      'Dynamics: expressive but natural—soften for intimacy, lift slightly for wonder; never shout.',
      'Storytelling style: cinematic yet approachable—charming narrator energy listeners trust.',
      'Dramatic intensity: medium—emotion through timing and brightness, not depth or drag.',
      'Emotional expression: genuine empathy; tenderness via softness, not whisper-mumble.',
      'Resonance: balanced chest and mask—forward, clear, attractive presence.',
      'Articulation: crisp Nepali consonants — retroflex vs dental, श/ष/स distinct; full chandrabindu on छौँ, तपाईँ; every word native-clear.'
    ].join(' ')
  },
  {
    id: 'penguin',
    gender: 'female',
    openAiVoice: 'nova',
    speed: 1.02,
    instructions: [
      'Voice identity: native Nepali sweet feminine katha voice—cute warm soft; NEVER Hindi heroine, deep alto, or English-stressed Nepali.',
      'Register: light high feminine head voice—airy sweetness; zero gravel; zero masculine undertone.',
      'Pitch contour: gentle upward melody; soft smile in every phrase; tender musical Nepali lilt.',
      'Cadence: natural flowing storytelling—unhurried, caring, like a sweet friend beside you.',
      'Speed & rhythm: slightly lively but clear; honor Nepali syllables; soft micro-pauses between clauses.',
      'Texture: honey-light and silky—milk-and-honey sweetness, not thick or dark.',
      'Dynamics: delicate tenderness; joy is bright and sparkling; sadness is soft never heavy.',
      'Storytelling style: intimate sweet Nepali katha voice—feminine, kind, irresistibly warm.',
      'Dramatic intensity: low-medium—emotion through sweetness and brightness, never weight or depth.',
      'Emotional expression: openly caring and gentle—voice stays light even on serious lines.',
      'Resonance: head-forward light feminine tone only; forbid chest resonance or low throat color.',
      'Articulation: gentle crisp Nepali phonetics — light feminine melody, audible ँ/ं, smooth compounds; pretty native flow, not robotic.'
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
      pitchRegister: 'mid warm baritone',
      cadence: 'natural conversational',
      texture: 'smooth warm clear',
      resonance: 'balanced chest-mask',
      storytellingStyle: 'approachable cinematic host',
      dramaticIntensity: 'medium natural',
      emotionWeight: 0.68,
      styleWeight: 0.7,
      pauseBiasMs: 145
    },
    penguin: {
      pitchRegister: 'light high feminine',
      cadence: 'gentle flowing',
      texture: 'honey-light silky',
      resonance: 'head-forward sweet',
      storytellingStyle: 'sweet light Nepali katha',
      dramaticIntensity: 'low-medium bright',
      emotionWeight: 0.74,
      styleWeight: 0.72,
      pauseBiasMs: 165
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
