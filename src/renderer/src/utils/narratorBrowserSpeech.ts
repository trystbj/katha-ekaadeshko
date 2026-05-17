import { getNarratorIntroSampleDisplay } from '../constants/narratorIntroSamples'
import { normalizeNarratorId } from '../constants/narrators'
import { narratorIdentityForId } from '../constants/narratorVoiceProfiles'
import {
  bcp47FromLangId,
  narrationLangVoiceHints,
  splitPreviewUtterances
} from './narrationSpeechPreview'
import { storyLanguageToPreviewLang } from '../constants/narratorIntroSamples'
import type { NarrationLanguageId } from '../types/story'

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([])
  }
  const s = window.speechSynthesis
  const v = s.getVoices()
  if (v.length) return Promise.resolve(v)
  return new Promise((resolve) => {
    const done = () => {
      s.removeEventListener('voiceschanged', done)
      resolve(s.getVoices())
    }
    s.addEventListener('voiceschanged', done)
    setTimeout(done, 300)
  })
}

function isMaleNarrator(narratorId: string) {
  return normalizeNarratorId(narratorId) === 'tryst_bj'
}

const GENDER_INDEX: Record<string, number> = {
  tryst_bj: 0,
  penguin: 1
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
  return m ?? null
}

type SpeakOpts = {
  narratorId: string
  storyLanguage?: string
  isCancelled: () => boolean
  onError: (e: unknown) => void
  onEnd?: () => void
}

function speakOne(utt: SpeechSynthesisUtterance, s: SpeechSynthesis): Promise<void> {
  return new Promise((resolve, reject) => {
    utt.onend = () => resolve()
    utt.onerror = (ev) => reject(ev.error || new Error('speech synthesis error'))
    s.speak(utt)
  })
}

/**
 * Fallback when OpenAI preview fails — chunked utterances for reliable playback.
 */
export async function speakNarratorBrowserPreview(opts: SpeakOpts): Promise<void> {
  const { narratorId, storyLanguage, isCancelled, onError, onEnd } = opts
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError(new Error('no tts'))
    return
  }
  const intro = getNarratorIntroSampleDisplay(narratorId, storyLanguage)
  if (!intro) {
    onError(new Error('no intro line'))
    return
  }
  const identity = narratorIdentityForId(narratorId)
  const s = window.speechSynthesis
  s.cancel()
  if (isCancelled()) return

  const voices = await loadVoices()
  if (isCancelled()) return
  const wantGender: 'male' | 'female' =
    identity?.gender === 'female' || identity?.gender === 'male'
      ? identity.gender
      : isMaleNarrator(narratorId)
        ? 'male'
        : 'female'
  const vNep =
    pickNarratorVoice(narratorId, voices) ||
    pickSouthAsianNameVoiceByGender(voices, wantGender) ||
    pickSouthAsianNameVoice(voices) ||
    voices[0]
  if (!vNep) {
    onError(new Error('no voice'))
    return
  }
  if (isCancelled()) return

  const langId: NarrationLanguageId = storyLanguage
    ? storyLanguageToPreviewLang(storyLanguage)
    : 'ne'
  const hints = narrationLangVoiceHints(langId)
  const utterLang =
    vNep.lang && hints.some((h) => (vNep.lang || '').toLowerCase().startsWith(h.toLowerCase().slice(0, 2)))
      ? vNep.lang
      : bcp47FromLangId(langId)

  const parts = splitPreviewUtterances(intro)
  const rate = identity?.browserTts.rate ?? 0.92
  const pitch = identity?.browserTts.pitch ?? 1

  try {
    for (const part of parts) {
      if (isCancelled()) return
      const u = new SpeechSynthesisUtterance(part)
      u.voice = vNep
      u.lang = utterLang
      u.rate = rate
      u.pitch = pitch
      await speakOne(u, s)
    }
    if (!isCancelled()) onEnd?.()
  } catch (e) {
    onError(e)
  }
}
