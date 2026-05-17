import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources'

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en'],
  nonExplicitSupportedLngs: true,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  returnNull: false,
  react: {
    useSuspense: false,
    bindI18n: 'languageChanged loaded',
    bindI18nStore: 'added removed'
  },
  missingKeyHandler: (lng, ns, key) => {
    console.warn(`[UNLOCALIZED_UI_STRING] missing i18n key "${String(key)}"`, { lng, ns })
  }
})

export default i18n
