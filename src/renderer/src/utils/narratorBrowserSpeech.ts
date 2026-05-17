import { getNarratorIntroSampleDisplay } from '../constants/narratorIntroSamples'
import { normalizeNarratorId } from '../constants/narrators'
import { narratorIdentityForId } from '../constants/narratorVoiceProfiles'
import {
  bcp47FromLangId,
  narrationLangVoiceHints,
  splitPreviewUtterances,
  waitForSpeechVoices
} from './narrationSpeechPreview'
import { storyLanguageToPreviewLang } from '../constants/narratorIntroSamples'
import type { NarrationLanguageId } from '../types/story'

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([])
  }
  return waitForSpeechVoices(window.speechSynthesis)
}

function isMaleNarrator(narratorId: string) {
  return normalizeNarratorId(narratorId) === 'tryst_bj'
}

function isProbablyMale(name: string) {
  const n = name.toLowerCase()
  return /male(?!$)|\bmale\b|david|mark|james|daniel|aaron|george|brian|thomas|guy|jason|josh|steve|oliver|fred|australian english male|google uk english male|en-gb.*male|en-us.*male|google us english m\b/i.test(
    n
  )
}

function isProbablyFemale(name: string) {
  const n = name.toLowerCase()
  return /female|\bzira\b|samantha|karen|hazel|heather|victoria|fiona|sarah|jennifer|sonia|neerja|aarti|jiya|ananya|kajal|tanya|diya|aadhya|veena|michelle|bella|amy|fiona|hazel|google us english(?!.*male)/i.test(
    n
  )
}

export function pickNarratorVoice(narratorId: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const canon = normalizeNarratorId(narratorId)
  const wantMale = isMaleNarrator(canon)
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  if (wantMale) {
    const maleTagged = en.filter((v) => isProbablyMale(v.name) && !isProbablyFemale(v.name))
    if (maleTagged.length) return maleTagged[0]!
    const notFemale = en.filter((v) => !isProbablyFemale(v.name))
    if (notFemale.length) return notFemale[0]!
  } else {
    const femaleTagged = en.filter((v) => isProbablyFemale(v.name))
    if (femaleTagged.length) return femaleTagged[0]!
    const notMale = en.filter((v) => !isProbablyMale(v.name))
    if (notMale.length) return notMale[0]!
  }
  return en[0] ?? voices[0]!
}

export function pickSouthAsianNameVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const ne = voices.filter((v) => /^ne(-|$)/i.test(v.lang || ''))
  if (ne.length) return ne[0]!
  const hi = voices.filter((v) => /^hi(-|$)/i.test(v.lang || ''))
  if (hi.length) return hi[0]!
  const named = voices.filter((v) =>
    /nepali|hindi|neerja|aarti|kajal|madhur|hemant|kalpana/i.test(v.name || '')
  )
  return named[0] ?? null
}

export function pickSouthAsianNameVoiceByGender(
  voices: SpeechSynthesisVoice[],
  gender: 'male' | 'female'
): SpeechSynthesisVoice | null {
  const ne = voices.filter((v) => /^ne(-|$)/i.test(v.lang || ''))
  const hi = voices.filter((v) => /^hi(-|$)/i.test(v.lang || ''))
  const pool = [...ne, ...hi]
  if (!pool.length) return pickSouthAsianNameVoice(voices)
  if (gender === 'female') {
    const f = pool.find((v) => isProbablyFemale(v.name))
    return f || pool[0]!
  }
  const m = pool.find((v) => isProbablyMale(v.name) && !isProbablyFemale(v.name))
  return m ?? pool[0] ?? null
}

type SpeakOpts = {
  narratorId: string
  storyLanguage?: string
  isCancelled: () => boolean
  onError: (e: unknown) => void
  onEnd?: () => void
}

/**
 * Reliable browser preview — same resume/voices pattern as narrationSpeechPreview.
 */
export async function speakNarratorBrowserPreview(opts: SpeakOpts): Promise<void> {
  const { narratorId, storyLanguage, isCancelled, onError, onEnd } = opts
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError(new Error('no tts'))
    return
  }
  const intro = getNarratorIntroSampleDisplay(narratorId, storyLanguage)
  if (!intro?.trim()) {
    onError(new Error('no intro line'))
    return
  }
  const identity = narratorIdentityForId(narratorId)
  const syn = window.speechSynthesis
  syn.cancel()
  await new Promise((r) => setTimeout(r, 50))
  if (isCancelled()) {
    onEnd?.()
    return
  }

  const voices = await loadVoices()
  if (isCancelled()) {
    onEnd?.()
    return
  }

  const wantGender: 'male' | 'female' =
    identity?.gender === 'female' || identity?.gender === 'male'
      ? identity.gender
      : isMaleNarrator(narratorId)
        ? 'male'
        : 'female'
  const voice =
    pickNarratorVoice(narratorId, voices) ||
    pickSouthAsianNameVoiceByGender(voices, wantGender) ||
    pickSouthAsianNameVoice(voices) ||
    voices[0]
  if (!voice) {
    onError(new Error('no voice'))
    return
  }
  if (isCancelled()) {
    onEnd?.()
    return
  }

  const langId: NarrationLanguageId = storyLanguage
    ? storyLanguageToPreviewLang(storyLanguage)
    : 'ne'
  const hints = narrationLangVoiceHints(langId)
  const utterLang =
    voice.lang && hints.some((h) => (voice.lang || '').toLowerCase().startsWith(h.toLowerCase().slice(0, 2)))
      ? voice.lang
      : bcp47FromLangId(langId)

  const parts = splitPreviewUtterances(intro)
  const rate = identity?.browserTts.rate ?? 0.92
  const pitch = identity?.browserTts.pitch ?? 1

  let idx = 0
  const finish = () => {
    if (!isCancelled()) onEnd?.()
  }

  const speakNext = () => {
    if (isCancelled()) {
      finish()
      return
    }
    if (idx >= parts.length) {
      finish()
      return
    }
    const u = new SpeechSynthesisUtterance(parts[idx])
    u.voice = voice
    u.lang = utterLang
    u.rate = rate
    u.pitch = pitch
    u.volume = 1
    u.onend = () => {
      idx += 1
      speakNext()
    }
    u.onerror = () => onError(new Error('speech synthesis error'))
    try {
      try {
        syn.resume()
      } catch {
        /* ignore */
      }
      syn.speak(u)
    } catch (e) {
      onError(e)
    }
  }

  speakNext()
}
