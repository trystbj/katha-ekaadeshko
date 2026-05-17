import type { AppUiLanguageCode } from './resources'

/** UI is fixed to English; Nepali script appears only in branding (`appTitle` / `BRAND_TITLE_TEXT`). */
export async function ensureUiLanguageBundle(_codeRaw: string): Promise<AppUiLanguageCode> {
  return 'en'
}

export function uiLanguageIsRtl(_code: string): boolean {
  return false
}

export function localeTagForUiLanguage(_code: string): string {
  return 'en-GB'
}
