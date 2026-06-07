import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { computeLocaleMenuPortalStyle } from '../utils/localeMenuPortal'
import {
  STORY_TRANSLATION_LANGUAGES,
  type StoryTranslationLangCode
} from '../utils/storyTranslationLanguages'
import '../styles/story-translate-modal.css'

const MENU_OPTS = {
  maxWidthCapPx: 168,
  maxHeightPx: 240,
  extraRightTuckMm: 1,
  placement: 'above' as const
}

type Props = {
  open: boolean
  busy?: boolean
  activeCode?: StoryTranslationLangCode
  anchorRef: RefObject<HTMLElement | null>
  portalWrapRef: RefObject<HTMLElement | null>
  onClose: () => void
  onTranslate: (code: StoryTranslationLangCode) => void
}

export function StoryTranslateModal({
  open,
  busy,
  activeCode = 'en',
  anchorRef,
  portalWrapRef,
  onClose,
  onTranslate
}: Props) {
  const uiText = useUiText()
  const [selected, setSelected] = useState<StoryTranslationLangCode>(activeCode)
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | undefined>(undefined)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setSelected(activeCode)
  }, [open, activeCode])

  useLayoutEffect(() => {
    setPortalHost(portalWrapRef.current)
  }, [portalWrapRef, open])

  useLayoutEffect(() => {
    if (!open || !portalWrapRef.current || !anchorRef.current) {
      setMenuStyle(undefined)
      return
    }
    const wrap = portalWrapRef.current
    const trigger = anchorRef.current
    const apply = () => setMenuStyle(computeLocaleMenuPortalStyle(trigger, wrap, MENU_OPTS))
    apply()
    window.addEventListener('resize', apply)
    window.addEventListener('scroll', apply, true)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener('scroll', apply, true)
    }
  }, [open, anchorRef, portalWrapRef])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onClose, anchorRef])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !portalHost || !menuStyle) return null

  return createPortal(
    <div
      ref={menuRef}
      className="story-translate-popover"
      role="dialog"
      aria-modal="false"
      aria-labelledby="story-translate-title"
      style={menuStyle}
    >
      <p id="story-translate-title" className="story-translate-popover__title">
        {uiText('storyTranslateModalTitle')}
      </p>

      <ul className="story-translate-popover__list" role="listbox" aria-label={uiText('storyTranslateSelectLanguage')}>
        {STORY_TRANSLATION_LANGUAGES.map((lang) => (
          <li key={lang.code}>
            <button
              type="button"
              role="option"
              aria-selected={selected === lang.code}
              className={`story-translate-popover__lang${selected === lang.code ? ' story-translate-popover__lang--on' : ''}`}
              onClick={() => setSelected(lang.code)}
            >
              <span className="story-translate-popover__flag" aria-hidden>
                {lang.flag}
              </span>
              <span className="story-translate-popover__label">{lang.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="story-translate-popover__actions">
        <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={onClose}>
          {uiText('storyTranslateCancel')}
        </button>
        <button
          type="button"
          className="btn btn-generate-cta btn-small"
          disabled={busy}
          onClick={() => onTranslate(selected)}
        >
          {busy ? uiText('storyTranslateBusy') : uiText('storyTranslateConfirm')}
        </button>
      </div>
    </div>,
    portalHost
  )
}
