import { getNarratorIntroSampleDisplay } from '../constants/narratorIntroSamples'
import { normalizeNarratorId } from '../constants/narrators'
import { narratorIdentityForId } from '../constants/narratorVoiceProfiles'

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
  const notLabelledFemale = en.filter((v) => !isProbablyFemale(v.name))
  const notLabelledMale = en.filter((v) => !isProbablyMale(v.name))
  const pool = wantMale ? (notLabelledFemale.length ? notLabelledFemale : en) : notLabelledMale.length ? notLabelledMale : en
  const list = pool.length ? pool : en
  if (!list.length) return voices[0]!
  const idx = GENDER_INDEX[canon] ?? 0
  return list[idx % list.length]!
}

export function pickSouthAsianNameVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const ne = voices.filter((v) => v.lang.toLowerCase().startsWith('ne') || /nepal|nepali|नेपा/i.test(v.name))
  if (ne.length) return ne[0]!
  const hi = voices.filter((v) => v.lang.toLowerCase().startsWith('hi') || /hindi|हिंदी/i.test(v.name))
  if (hi.length) return hi[0]!
  const enIn = voices.filter((v) => v.lang.toLowerCase().startsWith('en-in'))
  return enIn[0] ?? null
}

function pickSouthAsianNameVoiceByGender(
  voices: SpeechSynthesisVoice[],
  wantGender: 'male' | 'female'
): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const pool = voices.filter((v) => {
    const l = v.lang.toLowerCase()
    return (
      l.startsWith('ne') ||
      l.startsWith('hi') ||
      l.startsWith('en-in') ||
      /nepal|nepali|नेपा|hindi|हिंदी/i.test(v.name)
    )
  })
  if (!pool.length) return null

  const preferred =
    wantGender === 'male'
      ? pool.filter((v) => isProbablyMale(v.name) && !isProbablyFemale(v.name))
      : pool.filter((v) => isProbablyFemale(v.name) && !isProbablyMale(v.name))
  if (preferred.length) return preferred[0]!

  // If we can’t infer gender, at least choose a stable but varied option.
  return pool[0] ?? null
}

type SpeakOpts = {
  narratorId: string
  isCancelled: () => boolean
  onError: (e: unknown) => void
}

function speakOne(utt: SpeechSynthesisUtterance, s: SpeechSynthesis) {
  return new Promise<void>((resolve) => {
    const done = () => resolve()
    utt.onend = done
    utt.onerror = done
    s.speak(utt)
  })
}

/**
 * Fallback when OpenAI preview fails — speaks the same Nepali intro line as the server would use.
 */
export async function speakNarratorBrowserPreview(opts: SpeakOpts): Promise<void> {
  const { narratorId, isCancelled, onError } = opts
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError(new Error('no tts'))
    return
  }
  const intro = getNarratorIntroSampleDisplay(narratorId)
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
  const wantGender = identity?.gender ?? (isMaleNarrator(narratorId) ? 'male' : 'female')
  const vNep =
    pickSouthAsianNameVoiceByGender(voices, wantGender) ||
    pickNarratorVoice(narratorId, voices) ||
    pickSouthAsianNameVoice(voices) ||
    voices[0]
  if (!vNep) {
    onError(new Error('no voice'))
    return
  }
  if (isCancelled()) return

  const u = new SpeechSynthesisUtterance(intro)
  u.voice = vNep
  const l = vNep.lang.toLowerCase()
  u.lang = l.startsWith('ne') ? vNep.lang : l.startsWith('hi') ? vNep.lang : 'ne-NP'
  u.rate = identity?.browserTts.rate ?? 0.92
  u.pitch = identity?.browserTts.pitch ?? 1
  try {
    await speakOne(u, s)
  } catch (e) {
    onError(e)
  }
}
