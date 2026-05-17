/** Language packs — strings live in `./translations/*.ts` (English only). */
import { en } from './translations/en'

export type TranslationKeys = keyof typeof en

/** App UI locale — English only (branding title remains Nepali script in `appTitle`). */
export type AppUiLanguageCode = 'en'

export const resources = {
  en: { translation: en }
} as const

export const SUPPORTED_UI_LANGUAGE_CODES: readonly AppUiLanguageCode[] = ['en']

/** Normalize persisted / legacy codes to English (Nepali UI locale removed). */
export function normalizeUiLanguageCode(_code: string): AppUiLanguageCode {
  return 'en'
}
