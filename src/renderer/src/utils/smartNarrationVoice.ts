import { normalizeNarratorId } from '../constants/narrators'
import { narratorIdentityForId } from '../constants/narratorVoiceProfiles'
import type { NarrationLanguageId } from '../types/story'
import { buildVoiceDirection, type VoiceDirectorContext } from '../voice/voiceDirector'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function norm(s?: string) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
}

/** Browser preview + ranking context — mirrors adaptive backend cues without exposing controls. */
export type SmartNarrationPreviewContext = VoiceDirectorContext & {
  genre?: string
  theme?: string
  storyTone?: string
  narratorId?: string
  languageId?: NarrationLanguageId
}

export function smartPreviewBaseline(narratorId?: string): { rate: number; pitch: number } {
  const id = normalizeNarratorId(narratorId)
  const identity = narratorIdentityForId(id)
  return { rate: identity.browserTts.rate, pitch: identity.browserTts.pitch }
}

/** Genre / mood modifiers on base narrator prosody (Web Speech preview only). */
export function applySmartProsodyModifiers(
  ctx: SmartNarrationPreviewContext,
  base: { rate: number; pitch: number }
): { rate: number; pitch: number } {
  if (ctx.autoVoiceDirector !== false) {
    const dir = buildVoiceDirection(ctx)
    let rate = base.rate * dir.speedMul
    let pitch = base.pitch
    if (dir.whisperBias > 0.15) {
      rate *= 0.96
      pitch *= 0.98
    }
    if (dir.emphasis === 'high') {
      rate *= 1.02
    }
    return {
      rate: clamp(rate, 0.72, 1.28),
      pitch: clamp(pitch, 0.65, 1.42)
    }
  }

  let rate = base.rate
  let pitch = base.pitch
  const g = norm(ctx.genre)
  const tone = norm(ctx.storyTone)

  if (/horror|terror|ghost/.test(g)) {
    rate *= 0.93
    pitch *= 0.96
  }
  if (/mystery|detective|noir|thriller/.test(g)) {
    rate *= 0.95
    pitch *= 0.98
  }
  if (/comedy|humou?r|funny/.test(g)) {
    rate *= 1.04
    pitch *= 1.03
  }
  if (/romance|love story/.test(g)) {
    rate *= 0.97
    pitch *= 1.01
  }
  if (/action|adventure|war\b/.test(g)) {
    rate *= 1.03
    pitch *= 1.02
  }
  if (/fantasy|magical/.test(g)) {
    rate *= 0.98
    pitch *= 1.04
  }
  if (/myth|folklore|legend/.test(g)) {
    rate *= 0.94
    pitch *= 0.99
  }
  if (/children|kids|family/.test(g)) {
    rate *= 1.02
    pitch *= 1.05
  }
  if (/drama/.test(g) && !/melodrama/.test(g)) {
    rate *= 0.98
    pitch *= 0.99
  }

  if (tone === 'tense') {
    rate *= 0.96
    pitch *= 0.98
  } else if (tone === 'epic') {
    rate *= 0.97
    pitch *= 1.02
  } else if (tone === 'warm' || tone === 'tender') {
    rate *= 0.98
    pitch *= 1.01
  } else if (tone === 'whimsical') {
    rate *= 1.03
    pitch *= 1.03
  } else if (tone === 'noir') {
    rate *= 0.95
    pitch *= 0.97
  }

  return {
    rate: clamp(rate, 0.72, 1.28),
    pitch: clamp(pitch, 0.65, 1.42)
  }
}

/** Compress normalized pitch into Web Speech utterance pitch band. */
export function previewSpeechPitchFromNormalized(p: number): number {
  const q = clamp(p, 0.65, 1.42)
  return clamp(0.74 + q * 0.26, 0.68, 1.38)
}

export function scoreVoiceForSmartPreview(
  v: SpeechSynthesisVoice,
  languageId: NarrationLanguageId,
  ctx: SmartNarrationPreviewContext
): number {
  const name = (v.name || '').toLowerCase()
  let score = 0
  const narratorCanon = normalizeNarratorId(ctx.narratorId)

  if (/neural|natural|premium|enhanced|wavenet|online|multilingual|enterprise/i.test(name)) score += 85
  if (/google|microsoft|apple/i.test(name)) score += 28
  if (/compact|compact\s+v|tiny/i.test(name)) score -= 15

  if (languageId === 'hi') {
    if (/\bhindi\b|\bhemant\b|\bkalpana\b|\bswara\b|\bsapna\b|microsoft[^,]*hindi/i.test(name)) score += 55
  }
  if (languageId === 'pl') {
    if (/polish|polski|zosia|agnieszka|paulina|mateusz|zofia|pl-PL/i.test(name)) score += 55
  }
  if (languageId === 'en') {
    if (/\bhindi|italiano|español|français|deutsch|arabic|japanese|korean|chinese\b/i.test(name)) score -= 120
  }

  if (narratorCanon === 'penguin') {
    if (/\b(female|woman|girl|ms\.|mrs\.|madam|zira|joanna|jenny|aria|samantha|emma|linda|karen|hazel)\b/i.test(name))
      score += 38
  } else {
    if (/\b(male|man|mr\.|guy|david|mark|daniel|james|brian|tony|eric)\b/i.test(name)) score += 38
  }

  const g = norm(ctx.genre)
  if (/horror|mystery|thriller|noir/.test(g)) {
    if (/deep|low|dark|sinister/i.test(name)) score += 14
  }
  if (/comedy|children|fantasy/.test(g)) {
    if (/bright|young|girl|boy/i.test(name)) score += 10
  }

  if (/robot|fred\s|stephen\s+hawk|cricket/i.test(name)) score -= 60
  if (v.default) score += 4

  return score
}
