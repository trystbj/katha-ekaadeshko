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

function isProbablyMale(name: string) {
  const n = name.toLowerCase()
  return /male(?!$)|\bmale\b|\b(man|guy)\b|david|mark|james|daniel|aaron|george|brian|thomas|guy|jason|josh|steve|oliver|fred|hemant|madhur|ravi|sam|alex|microsoft.*\bmale\b|google uk english male|en-gb.*male|en-us.*male|google us english m\b/i.test(
    n
  )
}

function isProbablyFemale(name: string) {
  const n = name.toLowerCase()
  return /female|\bfemale\b|\bwoman\b|\bzira\b|samantha|karen|hazel|heather|victoria|fiona|sarah|jennifer|sonia|neerja|aarti|jiya|ananya|kajal|tanya|diya|aadhya|veena|michelle|bella|amy|google us english(?!.*male)/i.test(
    n
  )
}

function scoreMaleVoice(v: SpeechSynthesisVoice): number {
  const n = (v.name || '').toLowerCase()
  let s = 0
  if (isProbablyMale(n) && !isProbablyFemale(n)) s += 10
  if (/hemant|madhur|david|mark|james|guy|male/.test(n)) s += 8
  if (/^en(-|$)/i.test(v.lang || '')) s += 3
  if (/^ne(-|$)/i.test(v.lang || '') && /male|hemant/.test(n)) s += 6
  if (isProbablyFemale(n)) s -= 20
  return s
}

function scoreFemaleVoice(v: SpeechSynthesisVoice): number {
  const n = (v.name || '').toLowerCase()
  let s = 0
  if (isProbablyFemale(n)) s += 10
  if (/neerja|aarti|kajal|heera|sabina|veena|sonia|samantha|zira|karen|hazel/.test(n)) s += 8
  if (/^ne(-|$)|^hi(-|$)/i.test(v.lang || '')) s += 2
  if (isProbablyMale(n) && !isProbablyFemale(n)) s -= 15
  return s
}

/** Pick a clearly gendered system voice for narrator preview fallback. */
export function pickNarratorBrowserVoice(
  narratorId: string,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const wantMale = isMaleNarrator(narratorId)

  const scored = voices
    .map((v) => ({
      v,
      score: wantMale ? scoreMaleVoice(v) : scoreFemaleVoice(v)
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length) return scored[0]!.v

  if (wantMale) {
    const en = voices.filter(
      (v) => /^en(-|$)/i.test(v.lang || '') && !isProbablyFemale(v.name || '')
    )
    return en[0] ?? voices[0]!
  }

  const soft = voices.filter((v) => isProbablyFemale(v.name || '') || /^ne(-|$)/i.test(v.lang || ''))
  return soft[0] ?? voices[0]!
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

  const v = pickNarratorBrowserVoice(narratorId, voices)
  if (!v) {
    onError(new Error('no voice'))
    return
  }
  if (isCancelled()) return

  const langId: NarrationLanguageId = storyLanguage
    ? storyLanguageToPreviewLang(storyLanguage)
    : 'ne'
  const hints = narrationLangVoiceHints(langId)
  const utterLang =
    v.lang && hints.some((h) => (v.lang || '').toLowerCase().startsWith(h.toLowerCase().slice(0, 2)))
      ? v.lang
      : bcp47FromLangId(langId)

  const parts = splitPreviewUtterances(intro)
  const rate = identity?.browserTts.rate ?? (isMaleNarrator(narratorId) ? 1.0 : 1.02)
  const pitch = identity?.browserTts.pitch ?? (isMaleNarrator(narratorId) ? 0.82 : 1.14)

  try {
    for (const part of parts) {
      if (isCancelled()) return
      const u = new SpeechSynthesisUtterance(part)
      u.voice = v
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
