/**
 * Map story/UI language to a country string the backend `regionData` can resolve.
 * Unmapped codes fall back to a neutral value (Global region).
 */
export function inferCountryFromLanguageCode(code: string): string {
  const raw = (code || 'en').trim()
  const lower = raw.toLowerCase()

  const regionExact: Record<string, string> = {
    'zh-cn': 'China',
    'zh-sg': 'Singapore',
    'en-sg': 'Singapore',
    'en-my': 'Malaysia',
    'en-ph': 'Philippines',
    'ms-bn': 'Brunei'
  }
  if (regionExact[lower]) return regionExact[lower]

  const base = lower.split(/[-_]/)[0]
  const map: Record<string, string> = {
    en: 'United States',
    ne: 'Nepal',
    hi: 'India',
    ta: 'India',
    bn: 'Bangladesh',
    ur: 'Pakistan',
    ko: 'Korea',
    ja: 'Japan',
    'zh-cn': 'China',
    zh: 'China',
    ar: 'Saudi Arabia',
    es: 'Spain',
    fr: 'France',
    de: 'Germany',
    pt: 'Brazil',
    ru: 'Russia',
    it: 'Italy',
    tr: 'Turkey',
    th: 'Thailand',
    vi: 'Vietnam',
    id: 'Indonesia',
    pl: 'Poland',
    nl: 'Netherlands',
    uk: 'Ukraine',
    fa: 'Iran',
    he: 'Israel',
    ms: 'Malaysia',
    el: 'Greece',
    cs: 'Czech Republic',
    sv: 'Sweden',
    da: 'Denmark',
    nb: 'Norway',
    fi: 'Finland',
    ro: 'Romania',
    hu: 'Hungary',
    bg: 'Bulgaria',
    hr: 'Croatia',
    sk: 'Slovakia'
  }
  if (map[base]) return map[base]
  if (map[lower]) return map[lower]
  return 'International'
}
