/**
 * Web Speech API uses one `lang` hint per session — browsers do not expose true phrase-level language IDs.
 * We prefer browser/device locale (often matches spoken language), then story UI picks.
 */

const SHORT_TO_BCP47: Record<string, string> = {
  ne: 'ne-NP',
  en: 'en-US',
  hi: 'hi-IN',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  es: 'es-ES',
  ar: 'ar-SA',
  fr: 'fr-FR',
  de: 'de-DE',
  ta: 'ta-IN',
  bn: 'bn-BD',
  ur: 'ur-PK'
}

export function mapStoryLangToBcp47(code: string): string | null {
  const key = (code || '').trim().toLowerCase().split(/[-_]/)[0] || ''
  return key ? SHORT_TO_BCP47[key] ?? null : null
}

function normalizeNavigatorLang(raw: string): string | null {
  const base = raw.trim().replace(/_/g, '-')
  if (!base) return null
  const primary = base.split('-').filter(Boolean)[0]?.toLowerCase() ?? ''
  if (!/^[a-z]{2}$/.test(primary)) return null
  return SHORT_TO_BCP47[primary] ?? `${primary}-${primary.toUpperCase()}`
}

export function pickSpeechRecognitionLang(navLang: string | undefined, storyLang: string, uiLang: string): string {
  const fromNav = navLang ? normalizeNavigatorLang(navLang) : null
  if (fromNav) return fromNav

  const fromStory = mapStoryLangToBcp47(storyLang)
  if (fromStory) return fromStory

  const fromUi = mapStoryLangToBcp47(uiLang)
  if (fromUi) return fromUi

  return 'en-US'
}
