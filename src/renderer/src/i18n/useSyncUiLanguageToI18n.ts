import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useStudioStore } from '../store/useStudioStore'
import { ensureUiLanguageBundle, localeTagForUiLanguage, uiLanguageIsRtl } from './localizationEngine'
import { normalizeUiLanguageCode } from './resources'

function applyDocumentLocale(resolved: string): void {
  document.documentElement.lang = localeTagForUiLanguage(resolved)
  document.documentElement.dir = uiLanguageIsRtl(resolved) ? 'rtl' : 'ltr'
  try {
    localStorage.setItem('katha_ui_language', resolved)
  } catch {
    /* ignore */
  }
}

/**
 * Keeps i18next + `document` locale/dir aligned with studio store `uiLanguage`
 * (persisted). Skips redundant `changeLanguage` calls to avoid remount loops.
 */
export function useSyncUiLanguageToI18n(enabled = true): void {
  const { i18n } = useTranslation()
  const uiLanguage = useStudioStore((s) => s.uiLanguage)
  const setUiLanguagePending = useStudioStore((s) => s.setUiLanguagePending)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const target = normalizeUiLanguageCode(uiLanguage || 'en')
    const current = normalizeUiLanguageCode(i18n.resolvedLanguage || i18n.language || 'en')

    if (current === target) {
      applyDocumentLocale(target)
      setUiLanguagePending(null)
      return
    }

    setUiLanguagePending(target)
    void (async () => {
      try {
        const resolved = await ensureUiLanguageBundle(target)
        if (cancelled) return
        const after = normalizeUiLanguageCode(i18n.resolvedLanguage || i18n.language || 'en')
        if (after !== resolved) {
          await i18n.changeLanguage(resolved)
        }
        applyDocumentLocale(resolved)
      } finally {
        if (!cancelled) setUiLanguagePending(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, i18n, uiLanguage, setUiLanguagePending])
}
