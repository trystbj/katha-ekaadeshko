import React from 'react'
import ReactDOM from 'react-dom/client'
import '../src/renderer/src/i18n/config'
import LocalizedAppRoot from '../src/renderer/src/i18n/LocalizedAppRoot'
import '../src/renderer/src/styles/tailwind-input.css'
import '../src/renderer/src/styles/App.css'
import '../src/renderer/src/styles/studio-cinematic.css'
import '../src/renderer/src/styles/studio-mock-layout.css'
import '../src/renderer/src/styles/studio-desktop-lock.css'
import '../src/renderer/src/styles/custom-style-panel.css'
import '../src/renderer/src/styles/studio-dynamic-preview.css'
import '../src/renderer/src/styles/studio-premium-motion.css'
import '../src/renderer/src/styles/studio-cinematic-player.css'
import '../src/renderer/src/styles/episode-series-flow.css'
import './web.css'
import { ensureKathaBridge } from './kathaWebBridge'
import { localeTagForUiLanguage, uiLanguageIsRtl } from '../src/renderer/src/i18n/localizationEngine'
import { normalizeUiLanguageCode } from '../src/renderer/src/i18n/resources'

ensureKathaBridge()

const initialUi = (() => {
  try {
    return normalizeUiLanguageCode(localStorage.getItem('katha_ui_language') || 'en')
  } catch {
    return 'en'
  }
})()

document.documentElement.lang = localeTagForUiLanguage(initialUi)
document.documentElement.dir = uiLanguageIsRtl(initialUi) ? 'rtl' : 'ltr'

const rootEl = document.getElementById('root')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <LocalizedAppRoot />
    </React.StrictMode>
  )
}
