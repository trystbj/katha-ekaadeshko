/**
 * Human-like speech realism — breathing, flow, anti-robot instructions for TTS.
 */

/**
 * @param {Record<string, unknown>} ctx
 * @param {{ whisperBias?: number, warmth?: number, cinematicIntensity?: number }} [emotion]
 * @returns {string}
 */
export function humanSpeechRealismBlock(ctx, emotion = {}) {
  const whisper = emotion.whisperBias ?? 0
  const warmth = emotion.warmth ?? 0.5
  const intensity = emotion.cinematicIntensity ?? 0.5

  const genre = String(ctx?.genre || '').toLowerCase()
  const lines = [
    'Human realism: sound like a living storyteller — natural inhale between clauses, never mechanical cadence.',
    'Flow: connect sentences with cinematic transitions; soften phrase endings; avoid clipped or abrupt stops.',
    'Anti-robot: no metallic resonance, no flat intonation, no announcer stiffness, no synthetic equal pacing.',
    'Breathing: subtle audible breath before emotional turns; never exaggerated gasping.',
    'Paragraph rhythm: longer passages breathe at commas; climax lines earn a micro-pause before the key word.',
    'Dialogue in text: quoted lines feel improvised — micro-pause before/after quotes, then seamless return to narrator color.',
    'Performance acting: crying tension = soft crack on vowels not wailing; laughter = brief authentic chuckle not cartoon; romantic softness = intimate proximity not announcer warmth.'
  ]

  if (genre.includes('romance')) {
    lines.push('Romance delivery: softer landing, intimate proximity, tender vowel warmth on confessions.')
  } else if (genre.includes('horror') || genre.includes('thriller')) {
    lines.push('Suspense delivery: measured dread, meaningful silence, never rush the reveal.')
  } else if (genre.includes('comedy')) {
    lines.push('Comedy delivery: playful timing and reaction beats — humor from rhythm, not shouting.')
  }

  if (whisper > 0.15) {
    lines.push('Near-whisper mode: intimate proximity with full consonant clarity — not mumbling.')
  }
  if (warmth > 0.6) {
    lines.push('Warmth: honeyed vocal color, smile in the tone, gentle vowel rounding on tender words.')
  }
  if (intensity > 0.55) {
    lines.push('Cinematic intensity: dynamic range within one voice — lift on stakes, settle on calm without shouting.')
  }

  const nid = String(ctx?.narratorId || '').trim()
  if (nid === 'penguin') {
    lines.push('Female sweetness: light feminine register, soft endings, emotionally expressive but never childish or squeaky.')
  } else if (nid === 'tryst_bj') {
    lines.push(
      'Male presence lock: unmistakably masculine adult man — warm baritone-mid chest voice; never female pitch, never androgynous blend.'
    )
  }

  return lines.join(' ')
}
