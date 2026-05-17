export type GenerateMissingKey =
  | 'style'
  | 'narrator'
  | 'theme'
  | 'genre'
  | 'length'
  | 'storyLanguage'
  | 'idea'
  | 'customVisual'

const TOTAL_BASE = 7

/**
 * For the “first generate” flow: every field is required except working title/character.
 */
export function getGenerateReadiness(input: {
  hasBible: boolean
  styleId: string
  narratorId: string
  backendTheme: string
  backendGenre: string
  backendLength: string
  uiLanguage: string
  storyLanguage: string
  idea: string
  /** Plain-text custom style line when `styleId` is `custom`. */
  customVisualPrompt?: string
}): {
  canGenerate: boolean
  missing: GenerateMissingKey[]
  progress: number
  total: number
} {
  const total = input.styleId === 'custom' ? TOTAL_BASE + 1 : TOTAL_BASE
  if (input.hasBible) {
    return { canGenerate: false, missing: [], progress: total, total }
  }
  const missing: GenerateMissingKey[] = []
  if (!input.styleId) missing.push('style')
  if (!input.narratorId) missing.push('narrator')
  if (!input.backendTheme.trim()) missing.push('theme')
  if (!input.backendGenre.trim()) missing.push('genre')
  if (!input.backendLength.trim()) missing.push('length')
  if (!input.storyLanguage) missing.push('storyLanguage')
  if (input.idea.trim().length < 2) missing.push('idea')
  if (input.styleId === 'custom' && !input.customVisualPrompt?.trim()) missing.push('customVisual')
  return {
    canGenerate: missing.length === 0,
    missing,
    progress: total - missing.length,
    total
  }
}

export function i18nKeyForMissing(key: GenerateMissingKey): string {
  const map: Record<GenerateMissingKey, string> = {
    style: 'checklistStyle',
    narrator: 'checklistNarrator',
    theme: 'checklistTheme',
    genre: 'checklistGenre',
    length: 'checklistLength',
    storyLanguage: 'checklistStoryLanguage',
    idea: 'checklistIdea',
    customVisual: 'checklistCustomVisual'
  }
  return map[key]
}
