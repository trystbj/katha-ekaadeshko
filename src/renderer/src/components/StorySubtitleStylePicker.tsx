import { createPortal } from 'react-dom'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { computeLocaleMenuPortalStyle } from '../utils/localeMenuPortal'
import { useStudioStore } from '../store/useStudioStore'
import {
  SUBTITLE_PLAYBACK_PRESETS,
  SUBTITLE_PLAYBACK_PRESET_ORDER,
  type SubtitlePlaybackPresetId
} from '../constants/subtitlePlaybackPresets'

const MENU_OPTS = {
  maxWidthCapPx: Math.round(236 * 1.03),
  maxHeightPx: 340,
  extraRightTuckMm: 2
} as const

const RAIL_MENU_OPTS = {
  ...MENU_OPTS,
  placement: 'above' as const
}

export type StorySubtitleStylePickerProps = {
  menuPortalContainerRef: RefObject<HTMLElement | null>
  /** `rail` — compact CC control beside B/I on preview subtitle toolbar. */
  variant?: 'headline' | 'rail'
}

/** CC control beside the story seed headline (“More”) after `project.lastRenderVideoUrl` exists. */
export function StorySubtitleStylePicker({
  menuPortalContainerRef,
  variant = 'headline'
}: StorySubtitleStylePickerProps) {
  const rail = variant === 'rail'
  const uiText = useUiText()
  const busy = useStudioStore((s) => !!s.busy)
  const playbackSubtitlesOn = useStudioStore((s) => s.playbackSubtitlesOn)
  const presetId = useStudioStore((s) => s.subtitlePlaybackPresetId)
  const setPlaybackSubtitlesOn = useStudioStore((s) => s.setPlaybackSubtitlesOn)
  const setSubtitlePlaybackPresetId = useStudioStore((s) => s.setSubtitlePlaybackPresetId)

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
    const apply = () =>
      setPortalMenuStyle(computeLocaleMenuPortalStyle(trigger, wrap, rail ? RAIL_MENU_OPTS : MENU_OPTS))
    apply()
    window.addEventListener('resize', apply)
    window.addEventListener('scroll', apply, true)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener('scroll', apply, true)
    }
  }, [open, menuPortalContainerRef, rail])

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
      className={`studio-mock-locale-menu studio-mock-locale-menu--story-region studio-mock-subtitle-style-menu${
        rail ? ' studio-mock-subtitle-style-menu--above' : ''
      }`}
      role="dialog"
      aria-label={uiText('storySubtitleStyleTitle')}
      style={portalHostEl ? portalMenuStyle : undefined}
    >
      <div className="studio-mock-subtitle-style-menu__head">{uiText('storySubtitleStyleTitle')}</div>
      <label className="studio-mock-subtitle-style-menu__toggle">
        <input
          type="checkbox"
          checked={playbackSubtitlesOn}
          onChange={(e) => setPlaybackSubtitlesOn(e.target.checked)}
        />
        <span>{uiText('storySubtitleShowInPlayer')}</span>
      </label>
      <div className="studio-mock-subtitle-style-menu__divider" aria-hidden />
      <div className="studio-mock-subtitle-style-menu__presets" role="listbox" aria-label={uiText('storySubtitleStyleTitle')}>
        {SUBTITLE_PLAYBACK_PRESET_ORDER.map((id: SubtitlePlaybackPresetId) => {
          const preset = SUBTITLE_PLAYBACK_PRESETS[id]
          const active = presetId === id
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={active}
              className={`studio-mock-subtitle-style-preset${active ? ' studio-mock-subtitle-style-preset--active' : ''}`}
              onClick={() => {
                setSubtitlePlaybackPresetId(id)
                setOpen(false)
              }}
            >
              <span className="studio-mock-subtitle-style-preset__swatch" style={{ background: preset.swatch }} />
              <span className="studio-mock-subtitle-style-preset__label">{uiText(preset.labelKey)}</span>
            </button>
          )
        })}
      </div>
      <p className="studio-mock-subtitle-style-menu__hint">{uiText('storySubtitleTimingHint')}</p>
    </div>
  )

  return (
    <div
      className={`studio-mock-subtitle-picker${rail ? ' studio-mock-subtitle-picker--rail' : ''}`}
      ref={rootRef}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`studio-mock-subtitle-picker__trigger${
          rail ? ' storyboard-subtitle-rail__icon-btn' : ''
        }${open ? ' studio-mock-subtitle-picker__trigger--open' : ''}`}
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={uiText('storySubtitleStyleAria')}
        title={uiText('storySubtitleStyleAria')}
        onClick={() => {
          if (!busy) setOpen((v) => !v)
        }}
      >
        <span className="studio-mock-subtitle-picker__glyph" aria-hidden>
          {Glyphs.cc}
        </span>
        {rail ? null : (
          <span className="studio-mock-subtitle-picker__chev" aria-hidden>
            {Glyphs.caretDown}
          </span>
        )}
      </button>
      {open && portalHostEl ? createPortal(menuEl, portalHostEl) : open ? menuEl : null}
    </div>
  )
}
