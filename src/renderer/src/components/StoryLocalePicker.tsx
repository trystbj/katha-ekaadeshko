import { createPortal } from 'react-dom'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject
} from 'react'
import {
  getStoryLocaleMenuOptions,
  localeShortLabel,
  resolveStoryLocaleOption,
  type StoryLocaleOption
} from '../constants/storyLocaleOptions'
import { useStudioStore } from '../store/useStudioStore'
import { computeLocaleMenuPortalStyle } from '../utils/localeMenuPortal'
import { LocaleFlagDisplay } from './LocaleFlagDisplay'

export type StoryLocalePickerProps = {
  /** When set, list opens inside this element (e.g. story idea wrap) under the trigger — layout of the trigger unchanged. */
  menuPortalContainerRef?: RefObject<HTMLElement | null>
}

export function StoryLocalePicker({ menuPortalContainerRef }: StoryLocalePickerProps) {
  const uiText = useUiText()
  const busy = useStudioStore((s) => s.busy)
  const storyCountry = useStudioStore((s) => s.storyCountry)
  const storyLanguage = useStudioStore((s) => s.storyLanguage)
  const setStoryCountry = useStudioStore((s) => s.setStoryCountry)
  const setStoryLanguage = useStudioStore((s) => s.setStoryLanguage)

  const current = useMemo(
    () => resolveStoryLocaleOption(storyCountry, storyLanguage),
    [storyCountry, storyLanguage]
  )

  const currentLabel = useMemo(() => localeShortLabel(current), [current])

  const menuOptions = useMemo(() => getStoryLocaleMenuOptions(), [])

  const [open, setOpen] = useState(false)
  const [portalHostEl, setPortalHostEl] = useState<HTMLElement | null>(null)
  const [portalMenuStyle, setPortalMenuStyle] = useState<CSSProperties | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuPortalRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!menuPortalContainerRef) {
      setPortalHostEl(null)
      return
    }
    setPortalHostEl(menuPortalContainerRef.current)
  }, [menuPortalContainerRef, open])

  useLayoutEffect(() => {
    if (!open || !menuPortalContainerRef?.current || !triggerRef.current) {
      setPortalMenuStyle(undefined)
      return
    }

    const wrap = menuPortalContainerRef.current
    const trigger = triggerRef.current

    const apply = () => {
      setPortalMenuStyle(computeLocaleMenuPortalStyle(trigger, wrap))
    }

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

  const pick = (opt: StoryLocaleOption) => {
    setStoryCountry(opt.country)
    setStoryLanguage(opt.languageCode)
    setOpen(false)
  }

  const disabled = Boolean(busy)

  const menuClassName = `studio-mock-locale-menu studio-mock-locale-menu--story-region${
    menuPortalContainerRef ? ' studio-mock-locale-menu--in-idea-wrap' : ''
  }`

  const menuEl = (
    <div
      ref={menuPortalRef}
      className={menuClassName}
      role="listbox"
      aria-label={uiText('regionsAria')}
      style={portalHostEl ? portalMenuStyle : undefined}
    >
      {menuOptions.map((opt) => {
        const selected =
          opt.country === current.country && opt.languageCode === current.languageCode
        const rowLabel = localeShortLabel(opt)
        return (
          <button
            key={`${opt.country}-${opt.languageCode}`}
            type="button"
            role="option"
            aria-selected={selected}
            className={`studio-mock-locale-option${selected ? ' studio-mock-locale-option--active' : ''}`}
            onClick={() => pick(opt)}
          >
            <LocaleFlagDisplay iso2={opt.iso2} flag={opt.flag} title={rowLabel} />
            <span className="studio-mock-locale-option__text" title={rowLabel}>
              {rowLabel}
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="studio-mock-locale-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="studio-mock-locale-trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={uiText('storyRegionAria', { label: currentLabel })}
        title={currentLabel}
        onClick={() => {
          if (!disabled) setOpen((v) => !v)
        }}
      >
        <LocaleFlagDisplay iso2={current.iso2} flag={current.flag} title={currentLabel} />
        <span className="studio-mock-locale-trigger__name">{currentLabel}</span>
        <span className="studio-mock-locale-trigger__chev" aria-hidden>
          {Glyphs.caretDown}
        </span>
      </button>
      {open && portalHostEl ? createPortal(menuEl, portalHostEl) : open ? menuEl : null}
    </div>
  )
}
