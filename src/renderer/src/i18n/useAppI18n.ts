import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { uiText as resolveUiText } from './uiText'

/** Prefer dictionary keys from resources; `string` covers dynamic keys computed at runtime. */
export type UiTranslateFn = (
  key: string,
  options?: Record<string, string | number | boolean | null>
) => string

/** Single `useTranslation()` — use `uiText` for every user-visible string. */
export function useAppI18n(): { uiText: UiTranslateFn; i18n: ReturnType<typeof useTranslation>['i18n'] } {
  const res = useTranslation()
  const i18n = res.i18n
  const boundT = res.t
  const uiText = useCallback(
    (key: string, options?: Record<string, string | number | boolean | null>) =>
      resolveUiText(boundT, key, options),
    [boundT]
  )
  return { uiText, i18n }
}

/** When you only need localized strings (most components). */
export function useUiText(): UiTranslateFn {
  const { uiText } = useAppI18n()
  return uiText
}
