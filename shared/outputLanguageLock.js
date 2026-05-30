/**
 * Global English output lock — regional language/country affects culture only, never script language.
 */

export const OUTPUT_LANGUAGE = 'English'

export const OUTPUT_LANGUAGE_CODE = 'en'

/** Regional language codes → cultural atmosphere labels (NOT output language). */
const REGIONAL_CULTURE_LABEL = {
  ne: 'Nepal / Nepali cultural atmosphere',
  en: 'English-speaking cultural atmosphere',
  hi: 'India / Hindi cultural atmosphere',
  bn: 'Bengali cultural atmosphere',
  es: 'Spanish cultural atmosphere',
  fr: 'French cultural atmosphere',
  de: 'German cultural atmosphere',
  it: 'Italian cultural atmosphere',
  pt: 'Portuguese cultural atmosphere',
  ru: 'Russian cultural atmosphere',
  ja: 'Japan / Japanese cultural atmosphere',
  ko: 'Korea / Korean cultural atmosphere',
  zh: 'China / Chinese cultural atmosphere',
  'zh-cn': 'China / Chinese cultural atmosphere',
  id: 'Indonesian cultural atmosphere',
  ms: 'Malay cultural atmosphere',
  th: 'Thai cultural atmosphere',
  vi: 'Vietnamese cultural atmosphere',
  tl: 'Filipino cultural atmosphere',
  fil: 'Filipino cultural atmosphere',
  ar: 'Arabic cultural atmosphere',
  fa: 'Persian cultural atmosphere',
  he: 'Hebrew cultural atmosphere',
  el: 'Greek cultural atmosphere',
  cs: 'Czech cultural atmosphere',
  nl: 'Dutch cultural atmosphere',
  pl: 'Polish cultural atmosphere',
  tr: 'Turkish cultural atmosphere',
  uk: 'Ukrainian cultural atmosphere',
  ur: 'Urdu cultural atmosphere',
  ta: 'Tamil cultural atmosphere',
  te: 'Telugu cultural atmosphere',
  mr: 'Marathi cultural atmosphere',
  pa: 'Punjabi cultural atmosphere'
}

/**
 * Human label for regional cultural inspiration (never the prose output language).
 * @param {string} [code]
 */
export function regionalCultureLabel(code) {
  const raw = String(code || 'en').trim()
  const base = raw.split(/[-_]/)[0].toLowerCase()
  const compound = raw.toLowerCase()
  return REGIONAL_CULTURE_LABEL[compound] || REGIONAL_CULTURE_LABEL[base] || `${raw} regional cultural atmosphere`
}

/** @deprecated Use regionalCultureLabel — kept for pipeline imports. */
export function languageDisplayName(code) {
  return regionalCultureLabel(code)
}

export function resolveOutputLanguageCode() {
  return OUTPUT_LANGUAGE_CODE
}

/**
 * Injected at the start of LLM prompts (story, script, validation, intent, etc.).
 * @param {string} [regionalContext]
 */
export function englishOutputEnforcementBlock(regionalContext = '') {
  const regional = String(regionalContext || '').trim()
  return `ENGLISH OUTPUT ENFORCEMENT (global lock — non-negotiable):
Generate all outputs exclusively in fluent professional ${OUTPUT_LANGUAGE} regardless of the selected regional language, country, or culture setting.
Use the selected region ONLY for cultural inspiration: story setting, character names, clothing, environment, traditions, festivals, architecture, social context, and local atmosphere.
Regional selection must NEVER change the output language.
${regional ? `Regional cultural context (NOT output language): ${regional}.` : ''}
Forbidden in generated text unless USER SEED explicitly quotes a short foreign phrase inside otherwise-${OUTPUT_LANGUAGE} prose: non-English script systems (Devanagari, CJK, Arabic script, Hangul, Cyrillic for body text, etc.).
All of the following MUST be ${OUTPUT_LANGUAGE}: story title, summary, narration, scene descriptions, character descriptions, image prompts, animation prompts, screenplay, voice script, subtitle source text, and human-readable metadata.`
}

/**
 * Short line for image / animation prompt builders.
 */
export function imagePromptEnglishLockLine() {
  return `Write this prompt in ${OUTPUT_LANGUAGE} only; regional culture informs subject matter and names, not language.`
}

/**
 * @param {string} [storyLanguageCode]
 * @param {string} [country]
 */
export function regionalCultureContextLine(storyLanguageCode, country) {
  const culture = regionalCultureLabel(storyLanguageCode)
  const place = String(country || '').trim()
  return place
    ? `${culture}; country/setting anchor: ${place}`
    : culture
}
