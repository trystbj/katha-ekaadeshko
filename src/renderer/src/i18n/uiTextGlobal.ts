import type { TFunction } from 'i18next'
import i18n from './config'
import { uiText as resolveUiText } from './uiText'

/** Non-React paths (e.g. Zustand actions) — same guards as `uiText(t, …)`. */
export function uiTextGlobal(
  key: string,
  options?: Record<string, string | number | boolean | null>
): string {
  const t = i18n.t.bind(i18n) as TFunction
  return resolveUiText(t, key, options)
}
