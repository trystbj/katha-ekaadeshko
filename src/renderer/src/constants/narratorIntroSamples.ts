/**
 * Cinematic preview display — shared scripts in `core/voice/previewScriptLocales.js`.
 */
import { getCinematicPreviewDisplayText } from '@core/voice/previewScriptLocales.js'
import { resolvePreviewLanguage } from '@core/voice/previewLanguage.js'
import { normalizeNarratorId } from './narrators'
import type { NarrationLanguageId } from '../types/story'

/** @deprecated use getNarratorIntroSampleDisplay */
export const NARRATOR_INTRO_SAMPLES_NE: Record<string, string> = {
  get tryst_bj() {
    return getCinematicPreviewDisplayText('tryst_bj', 'ne')
  },
  get penguin() {
    return getCinematicPreviewDisplayText('penguin', 'ne')
  }
}

export function getNarratorIntroSampleDisplay(
  narratorId: string,
  storyLanguage?: string
): string {
  const id = normalizeNarratorId(narratorId)
  const lang = resolvePreviewLanguage({
    storyLanguage: storyLanguage || undefined
  })
  return getCinematicPreviewDisplayText(id, lang)
}

export function storyLanguageToPreviewLang(code: string): NarrationLanguageId {
  const l = resolvePreviewLanguage({ storyLanguage: code })
  return (l === 'zh' ? 'zh-CN' : l) as NarrationLanguageId
}
