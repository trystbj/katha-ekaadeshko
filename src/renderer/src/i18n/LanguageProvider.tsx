import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export type UiLangContextValue = {
  resolvedLanguage: string
}

const UiLangContext = createContext<UiLangContextValue>({ resolvedLanguage: 'en' })

/** Subscribe to the active UI locale (for memo deps when `t` is referentially stable). */
export function useUiResolvedLanguage(): string {
  return useContext(UiLangContext).resolvedLanguage
}

/**
 * Lightweight locale context. Full subtree remount on language change is handled by
 * `LocalizedAppRoot` (keys `<App />` for the main studio shell or a keyed fragment elsewhere).
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const resolvedLanguage = i18n.resolvedLanguage || i18n.language || 'en'

  const ctx = useMemo(() => ({ resolvedLanguage }), [resolvedLanguage])

  return <UiLangContext.Provider value={ctx}>{children}</UiLangContext.Provider>
}
