import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import {
  STORY_TRANSLATION_LANGUAGES,
  storyTranslationLanguageByCode,
  type StoryTranslationLangCode
} from '../utils/storyTranslationLanguages'
import '../styles/story-translate-modal.css'

type Props = {
  open: boolean
  activeCode?: StoryTranslationLangCode
  onClose: () => void
  /** Saves language preference only — does not translate story content. */
  onApply: (code: StoryTranslationLangCode) => void
}

export function StoryTranslateModal({
  open,
  activeCode = 'en',
  onClose,
  onApply
}: Props) {
  const uiText = useUiText()
  const [selected, setSelected] = useState<StoryTranslationLangCode>(activeCode)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setSelected(activeCode)
      setDropdownOpen(false)
    }
  }, [open, activeCode])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dropdownOpen) setDropdownOpen(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, dropdownOpen])

  useEffect(() => {
    if (!dropdownOpen) return
    const onDoc = (e: MouseEvent) => {
      if (dropdownRef.current?.contains(e.target as Node)) return
      setDropdownOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [dropdownOpen])

  if (!open) return null

  const selectedLang = storyTranslationLanguageByCode(selected)

  return createPortal(
    <div className="story-translate-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="story-translate-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-translate-heading"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="story-translate-heading" className="story-translate-modal__heading">
          {uiText('storyTranslateModalHeading')}
        </h2>

        <label className="story-translate-modal__label" htmlFor="story-translate-select">
          {uiText('storyTranslateModalTitle')}
        </label>

        <div ref={dropdownRef} className="story-translate-modal__select">
          <button
            id="story-translate-select"
            type="button"
            className="story-translate-modal__select-trigger"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <span className="story-translate-modal__select-value">
              {selectedLang ? (
                <>
                  <span aria-hidden>{selectedLang.flag}</span> {selectedLang.label}
                </>
              ) : (
                selected
              )}
            </span>
            <span className="story-translate-modal__select-chev" aria-hidden>
              ▼
            </span>
          </button>

          {dropdownOpen ? (
            <ul
              className="story-translate-modal__dropdown"
              role="listbox"
              aria-label={uiText('storyTranslateSelectLanguage')}
            >
              {STORY_TRANSLATION_LANGUAGES.map((lang) => (
                <li key={lang.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected === lang.code}
                    className={`story-translate-modal__option${selected === lang.code ? ' story-translate-modal__option--on' : ''}`}
                    onClick={() => {
                      setSelected(lang.code)
                      setDropdownOpen(false)
                    }}
                  >
                    <span aria-hidden>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <p className="story-translate-modal__hint">{uiText('storyTranslatePreferenceHint')}</p>

        <div className="story-translate-modal__actions">
          <button type="button" className="story-translate-modal__btn story-translate-modal__btn--cancel" onClick={onClose}>
            {uiText('storyTranslateCancel')}
          </button>
          <button
            type="button"
            className="story-translate-modal__btn story-translate-modal__btn--confirm"
            onClick={() => onApply(selected)}
          >
            {uiText('storyTranslateApply')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
