import { useEffect, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import {
  STORY_TRANSLATION_LANGUAGES,
  type StoryTranslationLangCode
} from '../utils/storyTranslationLanguages'
import '../styles/story-translate-modal.css'

type Props = {
  open: boolean
  busy?: boolean
  activeCode?: StoryTranslationLangCode
  onClose: () => void
  onTranslate: (code: StoryTranslationLangCode) => void
}

export function StoryTranslateModal({ open, busy, activeCode = 'en', onClose, onTranslate }: Props) {
  const uiText = useUiText()
  const [selected, setSelected] = useState<StoryTranslationLangCode>(activeCode)

  useEffect(() => {
    if (open) setSelected(activeCode)
  }, [open, activeCode])

  if (!open) return null

  return (
    <div className="modal-backdrop story-translate-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal story-translate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-translate-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="story-translate-title" className="story-translate-modal__title">
          {uiText('storyTranslateModalTitle')}
        </h2>
        <p className="story-translate-modal__lead">{uiText('storyTranslateModalLead')}</p>

        <ul className="story-translate-modal__list" role="listbox" aria-label={uiText('storyTranslateSelectLanguage')}>
          {STORY_TRANSLATION_LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                role="option"
                aria-selected={selected === lang.code}
                className={`story-translate-modal__lang${selected === lang.code ? ' story-translate-modal__lang--on' : ''}`}
                onClick={() => setSelected(lang.code)}
              >
                <span className="story-translate-modal__flag" aria-hidden>
                  {lang.flag}
                </span>
                <span>{lang.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="story-translate-modal__actions">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
            {uiText('storyTranslateCancel')}
          </button>
          <button
            type="button"
            className="btn btn-generate-cta"
            disabled={busy}
            onClick={() => onTranslate(selected)}
          >
            {busy ? uiText('storyTranslateBusy') : uiText('storyTranslateConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
