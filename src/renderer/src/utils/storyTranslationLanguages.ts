/** Supported story translation targets (view-only; original English is preserved). */
export type StoryTranslationLangCode =
  | 'en'
  | 'ne'
  | 'hi'
  | 'ja'
  | 'ko'
  | 'zh'
  | 'fr'
  | 'de'
  | 'es'
  | 'it'
  | 'pt'
  | 'ru'
  | 'ar'

export type StoryTranslationLanguage = {
  code: StoryTranslationLangCode
  label: string
  flag: string
  /** English name passed to the translation API. */
  apiName: string
}

export const STORY_TRANSLATION_LANGUAGES: StoryTranslationLanguage[] = [
  { code: 'en', label: 'English', flag: '🇺🇸', apiName: 'English' },
  { code: 'ne', label: 'Nepali', flag: '🇳🇵', apiName: 'Nepali' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳', apiName: 'Hindi' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵', apiName: 'Japanese' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷', apiName: 'Korean' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳', apiName: 'Chinese (Simplified)' },
  { code: 'fr', label: 'French', flag: '🇫🇷', apiName: 'French' },
  { code: 'de', label: 'German', flag: '🇩🇪', apiName: 'German' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸', apiName: 'Spanish' },
  { code: 'it', label: 'Italian', flag: '🇮🇹', apiName: 'Italian' },
  { code: 'pt', label: 'Portuguese', flag: '🇵🇹', apiName: 'Portuguese' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺', apiName: 'Russian' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦', apiName: 'Arabic' }
]

export function storyTranslationLanguageByCode(
  code: string
): StoryTranslationLanguage | undefined {
  return STORY_TRANSLATION_LANGUAGES.find((l) => l.code === code)
}
