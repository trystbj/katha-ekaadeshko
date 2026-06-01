import { createPortal } from 'react-dom'
import { useUiText } from '../i18n/useAppI18n'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { computeLocaleMenuPortalStyle } from '../utils/localeMenuPortal'
import type { SubtitleFontCategory } from '../types/subtitleStudio'

const FONT_CATS: SubtitleFontCategory[] = [
  'elegant',
  'serif',
  'sans',
  'cinematic',
  'bold',
  'handwritten',
  'playful',
  'traditional',
  'modern',
  'display'
]

const RAIL_FONT_MENU_OPTS = {
  maxWidthCapPx: Math.round(212 * 1.03),
  maxHeightPx: 400,
  extraRightTuckMm: 2,
  placement: 'above' as const
}

export type StorySubtitleFontPickerProps = {
  menuPortalContainerRef: RefObject<HTMLElement | null>
  value: SubtitleFontCategory
  disabled?: boolean
  onChange: (category: SubtitleFontCategory) => void
}

/** Preview-rail font list — same compact portal menu as CC subtitle look. */
export function StorySubtitleFontPicker({
  menuPortalContainerRef,
  value,
  disabled = false,
  onChange
}: StorySubtitleFontPickerProps) {
  const uiText = useUiText()
  const [open, setOpen] = useState(false)
  const [portalHostEl, setPortalHostEl] = useState<HTMLElement | null>(null)
  const [portalMenuStyle, setPortalMenuStyle] = useState<CSSProperties | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuPortalRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    setPortalHostEl(menuPortalContainerRef.current)
  }, [menuPortalContainerRef, open])

  useLayoutEffect(() => {
    if (!open || !menuPortalContainerRef?.current || !triggerRef.current) {
      setPortalMenuStyle(undefined)
      return
    }
    const wrap = menuPortalContainerRef.current
    const trigger = triggerRef.current
    const apply = () => setPortalMenuStyle(computeLocaleMenuPortalStyle(trigger, wrap, RAIL_FONT_MENU_OPTS))
    apply()
    window.addEventListener('resize', apply)
    window.addEventListener('scroll', apply, true)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener('scroll', apply, true)
    }
  }, [open, menuPortalContainerRef])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node
      if (rootRef.current?.contains(node)) return
      if (menuPortalRef.current?.contains(node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const menuEl = (
    <div
      ref={menuPortalRef}
      className="studio-mock-locale-menu studio-mock-locale-menu--story-region studio-mock-subtitle-style-menu studio-mock-subtitle-style-menu--above studio-mock-subtitle-style-menu--compact studio-mock-subtitle-font-menu"
      role="listbox"
      aria-label={uiText('subtitleStudioFontCategory')}
      style={portalHostEl ? portalMenuStyle : undefined}
    >
      <div className="studio-mock-subtitle-style-menu__presets">
        {FONT_CATS.map((fc) => {
          const active = value === fc
          return (
            <button
              key={fc}
              type="button"
              role="option"
              aria-selected={active}
              className={`studio-mock-subtitle-style-preset studio-mock-subtitle-style-preset--text-only${
                active ? ' studio-mock-subtitle-style-preset--active' : ''
              }`}
              onClick={() => {
                onChange(fc)
                setOpen(false)
              }}
            >
              <span className="studio-mock-subtitle-style-preset__label">{uiText(`subtitleStudioFont_${fc}`)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const currentLabel = uiText(`subtitleStudioFont_${value}`)

  return (
    <div className="studio-mock-subtitle-picker studio-mock-subtitle-picker--rail studio-mock-subtitle-picker--font" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`storyboard-subtitle-rail__font-trigger${open ? ' storyboard-subtitle-rail__font-trigger--open' : ''}`}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={uiText('subtitleStudioFontCategory')}
        title={currentLabel}
        onClick={() => {
          if (!disabled) setOpen((v) => !v)
        }}
      >
        <span className="storyboard-subtitle-rail__font-trigger-text">{currentLabel}</span>
      </button>
      {open && portalHostEl ? createPortal(menuEl, portalHostEl) : open ? menuEl : null}
    </div>
  )
}
