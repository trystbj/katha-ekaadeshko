import { Fragment, type ReactNode } from 'react'
import App from '../App'
import { useStudioStore } from '../store/useStudioStore'
import { LanguageProvider } from './LanguageProvider'
import { normalizeUiLanguageCode } from './resources'

/**
 * Stable locale key — only remount App when the user-facing UI language changes.
 * Do NOT include i18n `languageChanged` rev or pending flags (caused infinite remount loops).
 */
function useLocaleSignature(): string {
  return normalizeUiLanguageCode(useStudioStore((s) => s.uiLanguage))
}

function LocaleKeyedApp() {
  const localeSignature = useLocaleSignature()
  return <App key={localeSignature} />
}

function LocaleKeyedSubtree({ children }: { children: ReactNode }) {
  const localeSignature = useLocaleSignature()
  return <Fragment key={localeSignature}>{children}</Fragment>
}

type LocalizedAppRootProps = {
  children?: ReactNode
}

export default function LocalizedAppRoot({ children }: LocalizedAppRootProps) {
  return (
    <LanguageProvider>
      {children !== undefined ? <LocaleKeyedSubtree>{children}</LocaleKeyedSubtree> : <LocaleKeyedApp />}
    </LanguageProvider>
  )
}
