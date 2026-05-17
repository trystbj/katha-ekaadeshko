/**
 * Global emotion-aware narration analysis — scene/story → delivery dynamics + instruction fragments.
 */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {import('./voiceProfile.js').VoiceProfile} [profile]
 */
export function analyzeSceneEmotion(ctx, profile) {
  const blob = `${ctx?.narration || ''}\n${ctx?.visualDescription || ''}\n${ctx?.genre || ''}\n${ctx?.theme || ''}\n${ctx?.storyTone || ''}`.toLowerCase()

  let speedMul = 1
  let pauseBiasMs = 180
  let emphasis = 'medium'
  let whisperBias = 0
  let subtitleRevealBias = 1
  let warmth = 0.5
  let cinematicIntensity = 0.5
  const instructionParts = []

  const emotion = profile?.emotionStyle || 'neutral'
  const pacing = profile?.pacingStyle || 'moderate'

  switch (pacing) {
    case 'calm':
      speedMul *= 0.96
      pauseBiasMs += 40
      warmth += 0.1
      break
    case 'energetic':
      speedMul *= 1.04
      pauseBiasMs -= 25
      emphasis = 'high'
      cinematicIntensity += 0.15
      break
    case 'suspense':
      speedMul *= 0.95
      pauseBiasMs += 55
      whisperBias = 0.15
      subtitleRevealBias = 0.92
      cinematicIntensity += 0.2
      break
    case 'dramatic':
      speedMul *= 0.98
      pauseBiasMs += 35
      emphasis = 'high'
      subtitleRevealBias = 0.9
      cinematicIntensity += 0.25
      break
    default:
      break
  }

  switch (emotion) {
    case 'horror':
      speedMul *= 0.94
      pauseBiasMs += 30
      whisperBias = 0.22
      instructionParts.push('Emotion arc: horror — hushed dread, narrow vowels, breath-aware suspense.')
      break
    case 'comedy':
      speedMul *= 1.03
      pauseBiasMs -= 15
      instructionParts.push('Emotion arc: humor — brighter timing, subtle smile, nimble consonants.')
      break
    case 'action':
      speedMul *= 1.025
      emphasis = 'high'
      instructionParts.push('Emotion arc: action — forward momentum, crisp stressed syllables.')
      break
    case 'tender':
    case 'warm':
      speedMul *= 0.97
      pauseBiasMs += 20
      warmth += 0.2
      instructionParts.push('Emotion arc: tenderness — soft vowels, compassionate phrase endings.')
      break
    case 'mystery':
      pauseBiasMs += 45
      whisperBias = 0.12
      subtitleRevealBias = 0.88
      instructionParts.push('Emotion arc: mystery — patient pauses before reveals, controlled resonance.')
      break
    case 'epic':
    case 'fantasy':
      pauseBiasMs += 25
      emphasis = 'high'
      cinematicIntensity += 0.2
      instructionParts.push('Emotion arc: wonder/epic — spacious vowels on stakes, restrained peaks.')
      break
    case 'noir':
      whisperBias = 0.1
      instructionParts.push('Emotion arc: noir — smoky intimacy, cynical softness, late-night pacing.')
      break
    default:
      break
  }

  if (profile?.intensityLevel === 'high') emphasis = 'high'
  if (profile?.intensityLevel === 'low') {
    speedMul *= 0.98
    pauseBiasMs += 15
    warmth += 0.1
  }

  if (/\b(romance|kiss|embrace|heart flutter|beloved)\b/i.test(blob)) {
    warmth += 0.15
    pauseBiasMs += 15
    instructionParts.push('Romance beat: velvet proximity, gentle melodic contour — never soap opera.')
  }
  if (/\b(wonder|awe|marvel|starry|cosmic|magic)\b/i.test(blob)) {
    cinematicIntensity += 0.15
    instructionParts.push('Wonder beat: airy lift on discovery words, breath of awe.')
  }
  if (/\b(climax|finally|at last|showdown|peak)\b/i.test(blob)) {
    cinematicIntensity += 0.2
    pauseBiasMs += 20
    instructionParts.push('Climax beat: disciplined intensity buildup — meaningful pause before payoff.')
  }
  if (/\b(calm|peace|still|quiet morning|gentle)\b/i.test(blob)) {
    speedMul *= 0.97
    warmth += 0.1
    instructionParts.push('Calm beat: unhurried warmth, soft landing on phrase endings.')
  }
  if (/\b(whisper|hush|silence|secret)\b/i.test(blob)) whisperBias = Math.max(whisperBias, 0.2)
  if (/\b(reveal|suddenly|gasp|shock)\b/i.test(blob)) {
    pauseBiasMs += 30
    subtitleRevealBias = 0.85
    instructionParts.push('Reveal beat: micro-pause before key word, then clear forward delivery.')
  }
  if (/\b(laugh|joke|funny|grin)\b/i.test(blob)) {
    instructionParts.push('Humor beat: light rhythmic bounce — still intelligible.')
  }
  if (/\b(tear|grief|mourning|goodbye)\b/i.test(blob)) {
    warmth += 0.1
    speedMul *= 0.96
    instructionParts.push('Sadness beat: fragile softness — protect human breath texture.')
  }

  const canonNarrator = String(ctx?.narratorId || '').trim()
  if (canonNarrator === 'tryst_bj') {
    speedMul = Math.max(speedMul, 0.94)
    pauseBiasMs = Math.min(pauseBiasMs, 210)
  } else if (canonNarrator === 'penguin') {
    speedMul = Math.min(Math.max(speedMul, 0.98), 1.08)
    pauseBiasMs = Math.min(pauseBiasMs + 20, 240)
    warmth = Math.min(warmth + 0.1, 1)
  }

  return {
    speedMul: clamp(speedMul, 0.82, 1.14),
    pauseBiasMs: clamp(pauseBiasMs, 80, 340),
    emphasis,
    whisperBias: clamp(whisperBias, 0, 0.35),
    subtitleRevealBias: clamp(subtitleRevealBias, 0.75, 1.1),
    warmth: clamp(warmth, 0, 1),
    cinematicIntensity: clamp(cinematicIntensity, 0, 1),
    instructionParts: instructionParts.filter(Boolean)
  }
}
