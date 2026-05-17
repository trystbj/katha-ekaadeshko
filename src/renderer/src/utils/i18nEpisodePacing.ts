import type { UiTranslateFn } from '../i18n/useAppI18n'
import { uiTextGlobal } from '../i18n/uiTextGlobal'
import type { EpisodePacing } from '../types/story'

const PACING_KEYS: Record<EpisodePacing, string> = {
  Action: 'episodePacingAction',
  Emotional: 'episodePacingEmotional',
  Normal: 'episodePacingNormal',
  Climax: 'episodePacingClimax'
}

export function tEpisodePacing(uiText: UiTranslateFn, p: EpisodePacing): string {
  return uiText(PACING_KEYS[p])
}

/** Non-React callers (export, search builders). */
export function i18nEpisodePacingLabel(p: EpisodePacing): string {
  return uiTextGlobal(PACING_KEYS[p])
}
