import React from 'react'
import ReactDOM from 'react-dom/client'
import '../src/renderer/src/i18n/config'
import { SavedProjectsWindow } from '../src/renderer/src/components/SavedProjectsWindow'
import '../src/renderer/src/styles/tailwind-input.css'
import '../src/renderer/src/styles/App.css'
import '../src/renderer/src/styles/studio-cinematic.css'
import '../src/renderer/src/styles/studio-mock-layout.css'
import '../src/renderer/src/styles/studio-desktop-lock.css'
import './web.css'
import { ensureKathaBridge } from './kathaWebBridge'
import i18n from 'i18next'
import {
  ensureUiLanguageBundle,
  localeTagForUiLanguage,
  uiLanguageIsRtl
} from '../src/renderer/src/i18n/localizationEngine'
import { normalizeUiLanguageCode } from '../src/renderer/src/i18n/resources'
import LocalizedAppRoot from '../src/renderer/src/i18n/LocalizedAppRoot'

ensureKathaBridge()

document.documentElement.setAttribute('data-theme', 'dark')

const initialUi = (() => {
  try {
    return normalizeUiLanguageCode(localStorage.getItem('katha_ui_language') || 'en')
  } catch {
    return 'en'
  }
})()

void (async () => {
  try {
    await ensureUiLanguageBundle(initialUi)
    await i18n.changeLanguage(initialUi)
    document.documentElement.lang = localeTagForUiLanguage(initialUi)
    document.documentElement.dir = uiLanguageIsRtl(initialUi) ? 'rtl' : 'ltr'
  } catch {
    /* ignore */
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <LocalizedAppRoot>
        <SavedProjectsWindow />
      </LocalizedAppRoot>
    </React.StrictMode>
  )
})()

