import type { NarrationLanguageId, NarrationSettings } from '../types/story'
import { sanitizeNarrationLanguageId } from '../constants/narrationLanguages'
import { getCinematicPreviewScript } from '@core/voice/previewScriptLocales.js'
import { normalizeNarratorId } from '../constants/narrators'
import { resolvePreviewLanguage } from '@core/voice/previewLanguage.js'
import type { SmartNarrationPreviewContext } from './smartNarrationVoice'
import {
  applySmartProsodyModifiers,
  previewSpeechPitchFromNormalized,
  scoreVoiceForSmartPreview,
  smartPreviewBaseline
} from './smartNarrationVoice'

export type { SmartNarrationPreviewContext } from './smartNarrationVoice'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

const BCP47_BY_LANG: Partial<Record<NarrationLanguageId, string>> = {
  ne: 'ne-NP',
  hi: 'hi-IN',
  en: 'en-GB',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  'zh-CN': 'zh-CN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ar: 'ar-SA',
  ru: 'ru-RU',
  th: 'th-TH',
  bn: 'bn-BD',
  nl: 'nl-NL',
  ms: 'ms-MY',
  pt: 'pt-BR',
  cs: 'cs-CZ',
  el: 'el-GR',
  id: 'id-ID',
  fa: 'fa-IR',
  he: 'he-IL',
  it: 'it-IT',
  pl: 'pl-PL',
  sv: 'sv-SE',
  tr: 'tr-TR',
  uk: 'uk-UA',
  ur: 'ur-PK',
  vi: 'vi-VN'
}

export function bcp47FromLangId(lang: NarrationLanguageId): string {
  const hit = BCP47_BY_LANG[lang]
  if (hit) return hit
  if (String(lang).includes('-')) return String(lang)
  const code = String(lang).toLowerCase()
  return `${code}-${code.toUpperCase()}`
}

/** Ordered BCP-47 tags & synonyms — improves matching across OS voice packs (Chrome / Edge / Electron). */
export function narrationLangVoiceHints(lang: NarrationLanguageId): string[] {
  switch (lang) {
    case 'ne':
      return ['ne-NP', 'ne-IN', 'ne']
    case 'hi':
      return ['hi-IN', 'hi']
    case 'en':
      return [
        'en-SG',
        'en-GB',
        'en-US',
        'en-AU',
        'en-IN',
        'en-NZ',
        'en-CA',
        'en-ZA',
        'en-IE',
        'en-NG',
        'en-PH',
        'en'
      ]
    case 'ja':
      return ['ja-JP', 'ja']
    case 'ko':
      return ['ko-KR', 'ko']
    case 'zh':
    case 'zh-CN':
      return ['zh-CN', 'zh-Hans-CN', 'zh-Hans', 'zh-SG', 'cmn-CN', 'zh-TW', 'zh-HK', 'zh']
    case 'es':
      return ['es-ES', 'es-MX', 'es-US', 'es-AR', 'es-CO', 'es']
    case 'fr':
      return ['fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr']
    case 'de':
      return ['de-DE', 'de-AT', 'de-CH', 'de']
    case 'ar':
      return ['ar-SA', 'ar-AE', 'ar-EG', 'ar-XB', 'ar']
    case 'ru':
      return ['ru-RU', 'ru-UA', 'ru']
    case 'th':
      return ['th-TH', 'th']
    case 'bn':
      return ['bn-BD', 'bn-IN', 'bn']
    case 'nl':
      return ['nl-NL', 'nl-BE', 'nl']
    case 'ms':
      return ['ms-MY', 'ms-BN', 'ms']
    case 'pt':
      return ['pt-BR', 'pt-PT', 'pt']
    case 'cs':
      return ['cs-CZ', 'cs']
    case 'el':
      return ['el-GR', 'el']
    case 'id':
      return ['id-ID', 'id']
    case 'fa':
      return ['fa-IR', 'fa']
    case 'he':
      return ['he-IL', 'he']
    case 'it':
      return ['it-IT', 'it']
    case 'pl':
      return ['pl-PL', 'pl']
    case 'sv':
      return ['sv-SE', 'sv']
    case 'tr':
      return ['tr-TR', 'tr']
    case 'uk':
      return ['uk-UA', 'uk']
    case 'ur':
      return ['ur-PK', 'ur-IN', 'ur']
    case 'vi':
      return ['vi-VN', 'vi']
    default:
      return [bcp47FromLangId(lang), lang]
  }
}

export function normalizeSpeechLang(tag: string): string {
  return tag.trim().toLowerCase().replace('_', '-')
}

/** ISO 639-1 language code (first segment only — pairs zh-CN with zh-Hans-CN, etc.). */
function languageCode(langTag: string): string {
  const n = normalizeSpeechLang(langTag)
  const seg = n.split('-')[0]
  return seg || ''
}

/** Wait until the engine exposes voices (Chromium often fills the list after voiceschanged or a short delay). */
export function waitForSpeechVoices(speechSynthesis: SpeechSynthesis, timeoutMs = 3200): Promise<SpeechSynthesisVoice[]> {
  const immediate = speechSynthesis.getVoices()
  if (immediate.length > 0) return Promise.resolve(immediate)

  return new Promise((resolve) => {
    let settled = false
    let pollId = 0
    let timeoutId = 0

    const finish = () => {
      if (settled) return
      settled = true
      if (pollId !== 0) window.clearInterval(pollId)
      if (timeoutId !== 0) window.clearTimeout(timeoutId)
      speechSynthesis.removeEventListener('voiceschanged', onVoices)
      resolve(speechSynthesis.getVoices())
    }

    const onVoices = () => {
      if (speechSynthesis.getVoices().length > 0) finish()
    }

    speechSynthesis.addEventListener('voiceschanged', onVoices)

    const start = Date.now()
    pollId = window.setInterval(() => {
      if (speechSynthesis.getVoices().length > 0) finish()
      else if (Date.now() - start >= timeoutMs) finish()
    }, 60)

    timeoutId = window.setTimeout(finish, timeoutMs + 150)
  })
}

function voiceLangMatchesHints(voiceLang: string, hints: string[]): boolean {
  const vl = normalizeSpeechLang(voiceLang)
  if (!vl) return false
  const vLangCode = languageCode(vl)

  for (const h of hints) {
    const nh = normalizeSpeechLang(h)
    if (!nh) continue
    if (vl === nh) return true
    if (nh.length === 2 && vLangCode === nh) return true
    if (vl.startsWith(`${nh}-`) || nh.startsWith(`${vl}-`)) return true
    if (vLangCode && vLangCode === languageCode(nh)) return true
  }

  const hintLangCodes = new Set(hints.map((x) => languageCode(x)).filter(Boolean))
  return hintLangCodes.has(vLangCode)
}

function heuristicVoicePool(voices: SpeechSynthesisVoice[], langId: NarrationLanguageId): SpeechSynthesisVoice[] {
  const n = (s: string) => s.toLowerCase()
  switch (langId) {
    case 'hi': {
      const tagged = voices.filter((v) => languageCode(v.lang || '') === 'hi')
      if (tagged.length) return tagged
      return voices.filter(
        (v) =>
          /\bhindi\b|\bhemant\b|\bkalpana\b|\bswara\b|\bsapna\b|microsoft[^,]*hindi|hindi[^,]*\(india\)/i.test(
            n(v.name || '')
          )
      )
    }
    case 'pl': {
      const tagged = voices.filter((v) => languageCode(v.lang || '') === 'pl')
      if (tagged.length) return tagged
      return voices.filter((v) =>
        /\bpolish\b|polski|poland|zosia|agnieszka|paulina|mateusz|\bzofia\b/i.test(n(v.name || ''))
      )
    }
    case 'en': {
      const tagged = voices.filter((v) => languageCode(v.lang || '') === 'en')
      if (tagged.length) return tagged
      return voices.filter((v) => /\benglish\b/.test(n(v.name || '')))
    }
    default:
      return []
  }
}

/** Pick the best-matching voice for language + adaptive narrator/genre context. */
export function pickBestNarrationSpeechVoice(
  voices: SpeechSynthesisVoice[],
  languageId: NarrationLanguageId,
  smartCtx: SmartNarrationPreviewContext
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined

  const hints = narrationLangVoiceHints(languageId)
  const hintLangCode = languageCode(hints[0] || bcp47FromLangId(languageId))
  const candidates = voices.filter((v) => voiceLangMatchesHints(v.lang || '', hints))
  const loosePrimary = voices.filter((v) => languageCode(v.lang || '') === hintLangCode)

  let pool = candidates.length > 0 ? candidates : loosePrimary.length > 0 ? loosePrimary : []

  if (!pool.length && (languageId === 'hi' || languageId === 'en' || languageId === 'pl')) {
    const h = heuristicVoicePool(voices, languageId)
    if (h.length) pool = h
  }

  if (!pool.length) return undefined

  let best: SpeechSynthesisVoice | undefined
  let bestScore = -Infinity

  for (const v of pool) {
    let score = scoreVoiceForSmartPreview(v, languageId, smartCtx)

    const vl = normalizeSpeechLang(v.lang || '')
    const preferred = normalizeSpeechLang(hints[0] || '')
    if (preferred && vl === preferred) score += 120
    else if (hints.some((h) => normalizeSpeechLang(h) === vl)) score += 95
    else if (hints.some((h) => vl.startsWith(`${normalizeSpeechLang(h)}-`))) score += 70
    else score += 28

    if (score > bestScore) {
      bestScore = score
      best = v
    }
  }

  return best
}

/** Split preview into short clauses — many engines handle chained utterances more reliably than one long string. */
export function splitPreviewUtterances(text: string): string[] {
  const t = text.trim()
  if (!t) return []

  const chunks = t.split(/\s*(?<=[.。．!?！？।])\s+/).filter((s) => s.trim().length > 0)
  if (chunks.length > 1) return chunks.map((s) => s.trim())

  const commaChunks = t.split(/\s*(?<=[,，、])\s+/).filter((s) => s.trim().length > 0)
  if (commaChunks.length > 1) return commaChunks.map((s) => s.trim())

  return [t]
}

/** Cinematic preview sample in the selected story language. */
export function narrationSampleText(lang: NarrationLanguageId, narratorId?: string): string {
  const id = normalizeNarratorId(narratorId || 'tryst_bj')
  const code = resolvePreviewLanguage({ storyLanguage: lang })
  return getCinematicPreviewScript(id, code)
}

export function narrationPreviewSafetyMs(text: string, rate: number): number {
  const r = clamp(rate, 0.6, 1.4)
  const base = text.length * 110
  const adjusted = base / r
  return Math.min(95000, Math.max(16000, Math.ceil(adjusted)))
}

export type NarrationPreviewCallbacks = {
  onStart: () => void
  onEnd: () => void
}

let narrationPreviewGeneration = 0

function attachVoiceOnlyIfConsistent(
  voice: SpeechSynthesisVoice | undefined,
  langId: NarrationLanguageId,
  hints: string[]
): SpeechSynthesisVoice | undefined {
  if (!voice) return undefined
  const rawLang = (voice.lang || '').trim()
  if (!rawLang) return undefined
  if (!voiceLangMatchesHints(rawLang, hints)) return undefined
  const vlc = languageCode(rawLang)
  if (langId === 'en' && vlc !== 'en') return undefined
  if (langId === 'hi' && vlc !== 'hi') return undefined
  if (langId === 'pl' && vlc !== 'pl') return undefined
  return voice
}

function buildSmartCtx(extra?: Partial<SmartNarrationPreviewContext>): SmartNarrationPreviewContext {
  return {
    narratorId: extra?.narratorId,
    genre: extra?.genre,
    theme: extra?.theme,
    storyTone: extra?.storyTone
  }
}

export function runNarrationSpeechPreview(
  rawNarration: NarrationSettings,
  callbacks: NarrationPreviewCallbacks,
  adaptiveCtx?: Partial<SmartNarrationPreviewContext>
): void {
  narrationPreviewGeneration += 1
  const gen = narrationPreviewGeneration

  const previewLangId = sanitizeNarrationLanguageId(
    (adaptiveCtx?.storyLanguage as NarrationLanguageId | undefined) || rawNarration.languageId
  )
  const narration: NarrationSettings = {
    ...rawNarration,
    languageId: previewLangId
  }

  const smartCtx = buildSmartCtx(adaptiveCtx)

  const syn = window.speechSynthesis
  if (!syn) {
    callbacks.onEnd()
    return
  }

  syn.cancel()

  let cleaned = false
  let safetyTimer: number | undefined

  const finish = () => {
    if (cleaned) return
    if (gen !== narrationPreviewGeneration) return
    cleaned = true
    if (safetyTimer !== undefined) window.clearTimeout(safetyTimer)
    callbacks.onEnd()
  }

  callbacks.onStart()

  const sampleEarly = narrationSampleText(narration.languageId, smartCtx.narratorId)
  const partsEarly = splitPreviewUtterances(sampleEarly)
  if (partsEarly[0]) {
    try {
      syn.resume()
    } catch {
      // ignore
    }
    const u0 = new SpeechSynthesisUtterance(partsEarly[0])
    u0.lang = bcp47FromLangId(narration.languageId)
    u0.rate = 1
    u0.pitch = 1
    syn.speak(u0)
  }

  void (async () => {
    const voices = await waitForSpeechVoices(syn)
    if (gen !== narrationPreviewGeneration) return

    let voice = pickBestNarrationSpeechVoice(voices, narration.languageId, smartCtx)
    const hints = narrationLangVoiceHints(narration.languageId)
    voice = attachVoiceOnlyIfConsistent(voice, narration.languageId, hints)

    const sample = narrationSampleText(narration.languageId, smartCtx.narratorId)
    const parts = splitPreviewUtterances(sample)
    let idx = partsEarly[0] && parts[0] === partsEarly[0] ? 1 : 0

    const base = smartPreviewBaseline(smartCtx.narratorId)
    const mod = applySmartProsodyModifiers(smartCtx, base)
    const rate = mod.rate
    const pitch = previewSpeechPitchFromNormalized(mod.pitch)

    const utterLang =
      voice?.lang && voiceLangMatchesHints(voice.lang, hints) ? voice.lang : bcp47FromLangId(narration.languageId)

    const speakNext = () => {
      if (gen !== narrationPreviewGeneration || cleaned) return
      if (idx >= parts.length) {
        finish()
        return
      }

      const u = new SpeechSynthesisUtterance(parts[idx])
      u.lang = utterLang
      if (voice) u.voice = voice
      u.rate = rate
      u.pitch = pitch
      u.volume = 1

      u.onend = () => {
        idx += 1
        speakNext()
      }
      u.onerror = finish

      try {
        try {
          syn.resume()
        } catch {
          /* ignore */
        }
        syn.speak(u)
      } catch {
        finish()
      }
    }

    safetyTimer = window.setTimeout(() => {
      if (gen !== narrationPreviewGeneration) return
      finish()
    }, narrationPreviewSafetyMs(sample, rate))
    speakNext()
  })()
}
