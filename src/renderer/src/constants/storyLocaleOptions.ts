/** Country + flag + primary story language for one-line seed region (backend `country` + story text language). */
export type StoryLocaleOption = {
  country: string
  /** Fallback emoji when flag image fails or for non-country entries */
  flag: string
  /** BCP-style code aligned with narration / generation APIs */
  languageCode: string
  /** ISO 3166-1 alpha-2 for `flagcdn.com` — forces visible flags on Windows etc. */
  iso2?: string
  /** Shown in menu next to country (Nepali, Hindi, …) */
  languageHint?: string
}

export const STORY_LOCALE_DEFAULT: StoryLocaleOption = {
  country: 'Nepal',
  flag: '🇳🇵',
  languageCode: 'ne',
  iso2: 'np',
  languageHint: 'Nepali'
}

/**
 * Pinned at top: South Asia + East Asia staples, then popular Southeast Asian locales.
 */
export const STORY_LOCALE_PINNED_COUNTRIES = [
  'Nepal',
  'India',
  'South Korea',
  'China',
  'Japan',
  'Singapore',
  'Singapore (Hindi)',
  'Thailand',
  'Vietnam',
  'Indonesia',
  'Malaysia',
  'Philippines',
  'Cambodia',
  'Myanmar'
] as const

/** Sorted alphabetically by country name (full set). */
export const STORY_LOCALE_OPTIONS: StoryLocaleOption[] = [
  { country: 'Argentina', flag: '🇦🇷', languageCode: 'es', iso2: 'ar' },
  { country: 'Australia', flag: '🇦🇺', languageCode: 'en', iso2: 'au' },
  { country: 'Austria', flag: '🇦🇹', languageCode: 'de', iso2: 'at' },
  { country: 'Bangladesh', flag: '🇧🇩', languageCode: 'bn', iso2: 'bd' },
  { country: 'Belgium', flag: '🇧🇪', languageCode: 'nl', iso2: 'be' },
  { country: 'Brunei', flag: '🇧🇳', languageCode: 'ms', iso2: 'bn' },
  { country: 'Brazil', flag: '🇧🇷', languageCode: 'pt', iso2: 'br' },
  { country: 'Cambodia', flag: '🇰🇭', languageCode: 'en', iso2: 'kh' },
  { country: 'Canada', flag: '🇨🇦', languageCode: 'en', iso2: 'ca' },
  {
    country: 'China',
    flag: '🇨🇳',
    languageCode: 'zh-CN',
    iso2: 'cn',
    languageHint: 'Chinese'
  },
  { country: 'Czech Republic', flag: '🇨🇿', languageCode: 'cs', iso2: 'cz' },
  { country: 'Egypt', flag: '🇪🇬', languageCode: 'ar', iso2: 'eg' },
  { country: 'France', flag: '🇫🇷', languageCode: 'fr', iso2: 'fr' },
  { country: 'Germany', flag: '🇩🇪', languageCode: 'de', iso2: 'de' },
  { country: 'Greece', flag: '🇬🇷', languageCode: 'el', iso2: 'gr' },
  {
    country: 'India',
    flag: '🇮🇳',
    languageCode: 'hi',
    iso2: 'in',
    languageHint: 'Hindi'
  },
  { country: 'Indonesia', flag: '🇮🇩', languageCode: 'id', iso2: 'id' },
  { country: 'International', flag: '🌐', languageCode: 'en' },
  { country: 'Iran', flag: '🇮🇷', languageCode: 'fa', iso2: 'ir' },
  { country: 'Ireland', flag: '🇮🇪', languageCode: 'en', iso2: 'ie' },
  { country: 'Israel', flag: '🇮🇱', languageCode: 'he', iso2: 'il' },
  { country: 'Italy', flag: '🇮🇹', languageCode: 'it', iso2: 'it' },
  {
    country: 'Japan',
    flag: '🇯🇵',
    languageCode: 'ja',
    iso2: 'jp',
    languageHint: 'Japanese'
  },
  { country: 'Laos', flag: '🇱🇦', languageCode: 'en', iso2: 'la' },
  { country: 'Malaysia', flag: '🇲🇾', languageCode: 'ms', iso2: 'my' },
  { country: 'Mexico', flag: '🇲🇽', languageCode: 'es', iso2: 'mx' },
  { country: 'Myanmar', flag: '🇲🇲', languageCode: 'en', iso2: 'mm' },
  {
    country: 'Nepal',
    flag: '🇳🇵',
    languageCode: 'ne',
    iso2: 'np',
    languageHint: 'Nepali'
  },
  { country: 'Netherlands', flag: '🇳🇱', languageCode: 'nl', iso2: 'nl' },
  { country: 'New Zealand', flag: '🇳🇿', languageCode: 'en', iso2: 'nz' },
  { country: 'Nigeria', flag: '🇳🇬', languageCode: 'en', iso2: 'ng' },
  { country: 'Pakistan', flag: '🇵🇰', languageCode: 'ur', iso2: 'pk' },
  { country: 'Philippines', flag: '🇵🇭', languageCode: 'en', iso2: 'ph' },
  { country: 'Poland', flag: '🇵🇱', languageCode: 'pl', iso2: 'pl' },
  { country: 'Portugal', flag: '🇵🇹', languageCode: 'pt', iso2: 'pt' },
  { country: 'Russia', flag: '🇷🇺', languageCode: 'ru', iso2: 'ru' },
  { country: 'Saudi Arabia', flag: '🇸🇦', languageCode: 'ar', iso2: 'sa' },
  { country: 'Singapore', flag: '🇸🇬', languageCode: 'en', iso2: 'sg' },
  /** Separate code so narrator picker can pair 🇸🇬 + Hindi beside 🇮🇳 + Hindi */
  {
    country: 'Singapore (Hindi)',
    flag: '🇸🇬',
    languageCode: 'hi-SG',
    iso2: 'sg',
    languageHint: 'Hindi'
  },
  { country: 'South Africa', flag: '🇿🇦', languageCode: 'en', iso2: 'za' },
  {
    country: 'South Korea',
    flag: '🇰🇷',
    languageCode: 'ko',
    iso2: 'kr',
    languageHint: 'Korean'
  },
  { country: 'Spain', flag: '🇪🇸', languageCode: 'es', iso2: 'es' },
  { country: 'Sweden', flag: '🇸🇪', languageCode: 'sv', iso2: 'se' },
  { country: 'Switzerland', flag: '🇨🇭', languageCode: 'de', iso2: 'ch' },
  { country: 'Thailand', flag: '🇹🇭', languageCode: 'th', iso2: 'th' },
  { country: 'Timor-Leste', flag: '🇹🇱', languageCode: 'pt', iso2: 'tl' },
  { country: 'Turkey', flag: '🇹🇷', languageCode: 'tr', iso2: 'tr' },
  { country: 'Ukraine', flag: '🇺🇦', languageCode: 'uk', iso2: 'ua' },
  { country: 'United Kingdom', flag: '🇬🇧', languageCode: 'en', iso2: 'gb' },
  { country: 'United States', flag: '🇺🇸', languageCode: 'en', iso2: 'us' },
  { country: 'Vietnam', flag: '🇻🇳', languageCode: 'vi', iso2: 'vn' }
]

/** Menu order: Nepali / Hindi / Korean / Chinese / Japanese regions first, then A–Z rest (no duplicates). */
export function getStoryLocaleMenuOptions(): StoryLocaleOption[] {
  const pinned = STORY_LOCALE_PINNED_COUNTRIES.map((name) =>
    STORY_LOCALE_OPTIONS.find((o) => o.country === name)
  ).filter((x): x is StoryLocaleOption => Boolean(x))
  const pinnedSet = new Set<string>(STORY_LOCALE_PINNED_COUNTRIES as unknown as string[])
  const rest = STORY_LOCALE_OPTIONS.filter((o) => !pinnedSet.has(o.country)).sort((a, b) =>
    a.country.localeCompare(b.country)
  )
  return [...pinned, ...rest]
}

export function resolveStoryLocaleOption(storyCountry: string, storyLanguage: string): StoryLocaleOption {
  const langNorm = (storyLanguage || 'en').trim()
  const exact = STORY_LOCALE_OPTIONS.find(
    (o) => o.country === storyCountry && o.languageCode === langNorm
  )
  if (exact) return exact
  const byCountry = STORY_LOCALE_OPTIONS.find((o) => o.country === storyCountry)
  if (byCountry) return byCountry
  const byLang = STORY_LOCALE_OPTIONS.find((o) => o.languageCode === langNorm)
  return byLang ?? STORY_LOCALE_DEFAULT
}

/**
 * Picker display: common English country/region names (same style as Australia, India, Vietnam, Pakistan).
 * Full `option.country` stays in the store for the API. No ISO codes in the UI.
 */
const LOCALE_DISPLAY_NAME: Record<string, string> = {
  Argentina: 'Argentina',
  Australia: 'Australia',
  Austria: 'Austria',
  Bangladesh: 'Bangladesh',
  Belgium: 'Belgium',
  Brunei: 'Brunei',
  Brazil: 'Brazil',
  Cambodia: 'Cambodia',
  Canada: 'Canada',
  China: 'China',
  'Czech Republic': 'Czechia',
  Egypt: 'Egypt',
  France: 'France',
  Germany: 'Germany',
  Greece: 'Greece',
  India: 'India',
  Indonesia: 'Indonesia',
  International: 'Global',
  Iran: 'Iran',
  Ireland: 'Ireland',
  Israel: 'Israel',
  Italy: 'Italy',
  Japan: 'Japan',
  Laos: 'Laos',
  Malaysia: 'Malaysia',
  Mexico: 'Mexico',
  Myanmar: 'Myanmar',
  Nepal: 'Nepal',
  Netherlands: 'Netherlands',
  'New Zealand': 'New Zealand',
  Nigeria: 'Nigeria',
  Pakistan: 'Pakistan',
  Philippines: 'Philippines',
  Poland: 'Poland',
  Portugal: 'Portugal',
  Russia: 'Russia',
  'Saudi Arabia': 'Saudi Arabia',
  Singapore: 'Singapore',
  'Singapore (Hindi)': 'Singapore · Hindi',
  'South Africa': 'South Africa',
  'South Korea': 'Korea',
  Spain: 'Spain',
  Sweden: 'Sweden',
  Switzerland: 'Switzerland',
  Thailand: 'Thailand',
  'Timor-Leste': 'Timor-Leste',
  Turkey: 'Turkey',
  Ukraine: 'Ukraine',
  'United Kingdom': 'U.K.',
  'United States': 'USA',
  Vietnam: 'Vietnam'
}

export function localeShortLabel(option: StoryLocaleOption): string {
  return LOCALE_DISPLAY_NAME[option.country] ?? option.country
}
