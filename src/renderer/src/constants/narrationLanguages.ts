import { getStoryLocaleMenuOptions } from './storyLocaleOptions'
import type { NarrationLanguageId, NarrationSettings } from '../types/story'

/** English name of the language (not the country) — shown next to flag in narrator picker. */
export const NARRATION_LANGUAGE_LABEL_EN: Record<string, string> = {
  ne: 'Nepali',
  hi: 'Hindi',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  'zh-CN': 'Chinese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ar: 'Arabic',
  ru: 'Russian',
  th: 'Thai',
  bn: 'Bengali',
  nl: 'Dutch',
  ms: 'Malay',
  pt: 'Portuguese',
  cs: 'Czech',
  el: 'Greek',
  id: 'Indonesian',
  fa: 'Persian',
  he: 'Hebrew',
  it: 'Italian',
  pl: 'Polish',
  sv: 'Swedish',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  vi: 'Vietnamese'
}

/** Align narrator picker with story-region locales (deduped by primary story language code). */
export function normalizeNarrationLanguageCode(raw: string): NarrationLanguageId {
  const c = raw.trim()
  if (c === 'zh') return 'zh-CN'
  return c as NarrationLanguageId
}

type NarrationAiLegacy = NarrationSettings['ai'] & { keepOriginalNepaliNamesPlaces?: boolean }

function migrateNarrationAi(ai: NarrationSettings['ai']): NarrationSettings['ai'] {
  const legacy = ai as NarrationAiLegacy
  const { keepOriginalNepaliNamesPlaces: legacyNepali, ...rest } = legacy
  const preserveOriginalProperNames =
    typeof legacy.preserveOriginalProperNames === 'boolean'
      ? legacy.preserveOriginalProperNames
      : typeof legacyNepali === 'boolean'
        ? legacyNepali
        : true
  return { ...rest, preserveOriginalProperNames }
}

export function createDefaultNarrationSettings(): NarrationSettings {
  return {
    languageId: 'ne',
    voiceMode: 'auto',
    autoVoiceDirector: true,
    narratorGenderPreference: 'auto',
    ai: {
      autoTranslateToNarrationLanguage: false,
      preserveOriginalProperNames: true,
      generateSubtitlesAutomatically: false,
      dualSubtitleMode: false,
      lipSyncDialogueWithSelectedLanguage: false,
      multiNarratorMode: false,
      episodeNarratorConsistencyLock: false
    }
  }
}

/** Normalize legacy IDs when loading projects or running preview (`zh` → `zh-CN`). Migrate narration AI keys. Strip deprecated manual voice fields. */
export function sanitizeNarrationSettingsLanguage(raw: NarrationSettings | Record<string, unknown>): NarrationSettings {
  const n = raw as NarrationSettings & Record<string, unknown>
  const defaults = createDefaultNarrationSettings()
  const aiMerged = migrateNarrationAi({
    ...defaults.ai,
    ...(typeof n.ai === 'object' && n.ai ? (n.ai as NarrationSettings['ai']) : {})
  })
  const autoVoiceDirector =
    typeof n.autoVoiceDirector === 'boolean' ? n.autoVoiceDirector : defaults.autoVoiceDirector
  const narratorGenderPreference =
    typeof n.narratorGenderPreference === 'string'
      ? (n.narratorGenderPreference as NarrationSettings['narratorGenderPreference'])
      : defaults.narratorGenderPreference

  return {
    languageId: sanitizeNarrationLanguageId((n.languageId as NarrationLanguageId) || 'en'),
    voiceMode: 'auto',
    autoVoiceDirector,
    narratorGenderPreference,
    ai: aiMerged
  }
}

export type NarrationLanguageRow = {
  id: NarrationLanguageId
  /** Language name only (not country) */
  label: string
  flag: string
  /** ISO 3166-1 alpha-2 (for `flagcdn.com`) when available */
  iso2?: string
}

function labelForLangId(id: NarrationLanguageId): string {
  return NARRATION_LANGUAGE_LABEL_EN[id] ?? String(id).toUpperCase()
}

/**
 * Same ordering as story-region menu (pinned regions first), one row per distinct `languageCode`.
 * Label = language name; flag = first region’s flag for that code (e.g. English 🇸🇬 from Singapore).
 */
export function getNarrationLanguageMenuRows(): NarrationLanguageRow[] {
  const seen = new Set<string>()
  const rows: NarrationLanguageRow[] = []
  for (const o of getStoryLocaleMenuOptions()) {
    const id = normalizeNarrationLanguageCode(o.languageCode)
    if (seen.has(id)) continue
    seen.add(id)
    rows.push({
      id,
      label: labelForLangId(id),
      flag: o.flag,
      iso2: o.iso2
    })
  }
  return rows
}

/** Migrate legacy saves (`zh` → `zh-CN`, unknown → `en`). */
export function sanitizeNarrationLanguageId(raw: string | undefined): NarrationLanguageId {
  const s = (raw || 'en').trim()
  if (s === 'zh') return 'zh-CN'
  const rows = getNarrationLanguageMenuRows()
  const hit = rows.some((r) => r.id === s)
  if (hit) return s as NarrationLanguageId
  return 'en'
}
