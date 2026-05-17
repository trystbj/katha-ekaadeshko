/**
 * Resolve language for narrator preview (story language before generation).
 */

const SUPPORTED = new Set([
  'ne',
  'hi',
  'en',
  'ja',
  'ko',
  'zh',
  'es',
  'fr',
  'de',
  'ar',
  'ru',
  'th',
  'bn',
  'nl',
  'ms',
  'pt',
  'cs',
  'el',
  'id',
  'fa',
  'he',
  'it',
  'pl',
  'sv',
  'tr',
  'uk',
  'ur',
  'vi'
])

/** @param {string} [code] */
export function basePreviewLang(code) {
  const raw = String(code || '')
    .trim()
    .toLowerCase()
  if (!raw) return 'ne'
  if (raw === 'zh-cn' || raw === 'zh_cn') return 'zh'
  const base = raw.split(/[-_]/)[0] || 'ne'
  return SUPPORTED.has(base) ? base : 'en'
}

/**
 * Priority: story language (pre-generation locale) → narration language → UI language.
 * @param {{ storyLanguage?: string, narrationLanguage?: string, uiLang?: string }} opts
 */
export function resolvePreviewLanguage(opts = {}) {
  const story = basePreviewLang(opts.storyLanguage)
  if (opts.storyLanguage && String(opts.storyLanguage).trim()) return story
  const narration = basePreviewLang(opts.narrationLanguage)
  if (opts.narrationLanguage && String(opts.narrationLanguage).trim()) return narration
  return basePreviewLang(opts.uiLang || 'ne')
}
