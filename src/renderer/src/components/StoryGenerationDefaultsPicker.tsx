import { createPortal } from 'react-dom'
import { useUiText, type UiTranslateFn } from '../i18n/useAppI18n'
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
import { useStudioStore } from '../store/useStudioStore'
import { computeLocaleMenuPortalStyle } from '../utils/localeMenuPortal'
import type { NarrationLanguageId, NarrationSettings } from '../types/story'
import {
  getNarrationLanguageMenuRows,
  sanitizeNarrationSettingsLanguage
} from '../constants/narrationLanguages'
import { NARRATOR_UI_PRESETS, normalizeNarratorId } from '../constants/narrators'
import { VoiceReactiveBars } from './VoiceReactiveBars'
import { runNarrationSpeechPreview } from '../utils/narrationSpeechPreview'
import '../styles/narrator-language-voice.css'

type FontMode = 'clean' | 'story' | 'comic'
type StoryTone = '' | 'warm' | 'tense' | 'epic' | 'tender' | 'whimsical' | 'noir'

const FONT_ORDER: FontMode[] = ['clean', 'story', 'comic']

const TONE_ROWS: { id: StoryTone; key: string }[] = [
  { id: '', key: 'toneNeutral' },
  { id: 'warm', key: 'toneWarm' },
  { id: 'tense', key: 'toneTense' },
  { id: 'epic', key: 'toneEpic' },
  { id: 'tender', key: 'toneTender' },
  { id: 'whimsical', key: 'toneWhimsical' },
  { id: 'noir', key: 'toneNoir' }
]

/** Menu fits tone rows + toggle — wider cap than regional country strip. */
const IDEA_WRAP_MENU_OPTS = {
  maxWidthCapPx: Math.round(248 * 1.03),
  maxHeightPx: 340,
  /** Tighter to idea-wrap right vs regional menu (less dead space). */
  extraRightTuckMm: 4
} as const

function fontTriggerLabel(mode: FontMode, translate: UiTranslateFn): string {
  if (mode === 'clean') return translate('fontClean')
  if (mode === 'comic') return translate('fontComic')
  return translate('fontStory')
}

/** Matches story-region languages (`storyLocaleOptions`) — pinned locales first, then A–Z. */
const NARRATION_LANGS = getNarrationLanguageMenuRows()

export type StoryGenerationDefaultsPickerProps = {
  menuPortalContainerRef?: RefObject<HTMLElement | null>
  /**
   * When provided, the trigger button will call this instead of opening a dropdown.
   * Used to open the settings inside the existing Generated dialog/panel.
   */
  onRequestOpenInGeneratedDialog?: () => void
  /**
   * Render the menu content directly (no trigger / dropdown behavior).
   * Intended to be embedded inside the Generated panel "dialog box".
   */
  embeddedInGeneratedDialog?: boolean
}

/** Reading font, tone, episode-chain toggle — menu can portal into idea wrap like regional picker. */
export function StoryGenerationDefaultsPicker({
  menuPortalContainerRef,
  onRequestOpenInGeneratedDialog,
  embeddedInGeneratedDialog
}: StoryGenerationDefaultsPickerProps) {
  const uiText = useUiText()
  const busy = useStudioStore((s) => s.busy)
  const uiFontMode = useStudioStore((s) => s.uiFontMode)
  const setUiFontMode = useStudioStore((s) => s.setUiFontMode)
  const storyTone = useStudioStore((s) => s.storyTone)
  const setStoryTone = useStudioStore((s) => s.setStoryTone)
  const episodeChainPreferred = useStudioStore((s) => s.episodeChainPreferred)
  const setEpisodeChainPreferred = useStudioStore((s) => s.setEpisodeChainPreferred)
  const project = useStudioStore((s) => s.project)
  const patchProject = useStudioStore((s) => s.patchProject)
  const narrationDraft = useStudioStore((s) => s.narrationDraft)
  const setNarrationDraft = useStudioStore((s) => s.setNarrationDraft)
  const narratorId = useStudioStore((s) => s.narratorId)
  const storyLanguage = useStudioStore((s) => s.storyLanguage)
  const backendGenre = useStudioStore((s) => s.backendGenre)

  const narration = project?.narration ?? narrationDraft
  const setNarration = (next: NarrationSettings) => {
    const canon = sanitizeNarrationSettingsLanguage(next)
    if (project) {
      patchProject((p) => ({ ...p, narration: canon, updatedAt: new Date().toISOString() }))
    } else {
      setNarrationDraft(canon)
    }
  }

  const fontLabel = useMemo(() => fontTriggerLabel(uiFontMode, uiText), [uiFontMode, uiText])

  const detailTitle = useMemo(() => {
    const tonePart =
      storyTone === ''
        ? uiText('toneNeutral')
        : uiText(TONE_ROWS.find((r) => r.id === storyTone)?.key ?? 'toneNeutral')
    return `${uiText('storyGenMenuSectionFont')}: ${fontLabel}. ${uiText('storyGenMenuSectionTone')}: ${tonePart}. ${
      episodeChainPreferred ? uiText('episodeChainToggle') + ' ✓' : ''
    }`
  }, [uiText, fontLabel, storyTone, episodeChainPreferred])

  const [open, setOpen] = useState(false)
  const [previewOn, setPreviewOn] = useState(false)
  const [narratorDropdownOpen, setNarratorDropdownOpen] = useState<null | 'language'>(null)
  const [portalHostEl, setPortalHostEl] = useState<HTMLElement | null>(null)
  const [portalMenuStyle, setPortalMenuStyle] = useState<CSSProperties | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuPortalRef = useRef<HTMLDivElement>(null)
  const narratorDropdownZoneRef = useRef<HTMLDivElement>(null)

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
      setPortalMenuStyle(computeLocaleMenuPortalStyle(trigger, wrap, IDEA_WRAP_MENU_OPTS))
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
    if (!narratorDropdownOpen) return
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node
      if (narratorDropdownZoneRef.current?.contains(node)) return
      setNarratorDropdownOpen(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [narratorDropdownOpen])

  useEffect(() => {
    if (!narratorDropdownOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNarratorDropdownOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [narratorDropdownOpen])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const disabled = Boolean(busy)

  const menuClassName = `studio-mock-locale-menu studio-mock-locale-menu--story-region studio-mock-locale-menu--gen-defaults${
    menuPortalContainerRef ? ' studio-mock-locale-menu--in-idea-wrap' : ''
  }`

  const langRow =
    NARRATION_LANGS.find((x) => x.id === narration.languageId) ??
    NARRATION_LANGS.find((x) => x.id === 'en') ??
    NARRATION_LANGS[0]!
  const narratorCanon = normalizeNarratorId(narratorId)
  const narratorPreset =
    NARRATOR_UI_PRESETS.find((x) => x.id === narratorCanon) ?? NARRATOR_UI_PRESETS[0]!

  const menuEl = (
    <div
      ref={menuPortalRef}
      className={menuClassName}
      role="listbox"
      aria-label={uiText('storyGenDefaultsAria')}
      style={portalHostEl ? portalMenuStyle : undefined}
    >
      <div className="studio-mock-locale-menu__section-label">{uiText('storyGenMenuSectionFont')}</div>
      {FONT_ORDER.map((mode) => {
        const selected = uiFontMode === mode
        return (
          <button
            key={mode}
            type="button"
            role="option"
            aria-selected={selected}
            className={`studio-mock-locale-option studio-mock-locale-option--text-only${selected ? ' studio-mock-locale-option--active' : ''}`}
            onClick={() => {
              setUiFontMode(mode)
              setOpen(false)
            }}
          >
            <span className="studio-mock-locale-option__text">{fontTriggerLabel(mode, uiText)}</span>
          </button>
        )
      })}
      <div className="studio-mock-locale-menu__divider" aria-hidden />
      <div className="studio-mock-locale-menu__section-label">{uiText('storyGenMenuSectionTone')}</div>
      {TONE_ROWS.map((row) => {
        const selected = storyTone === row.id
        return (
          <button
            key={row.id || 'neutral'}
            type="button"
            role="option"
            aria-selected={selected}
            className={`studio-mock-locale-option studio-mock-locale-option--text-only${selected ? ' studio-mock-locale-option--active' : ''}`}
            onClick={() => {
              setStoryTone(row.id)
              setOpen(false)
            }}
          >
            <span className="studio-mock-locale-option__text">{uiText(row.key)}</span>
          </button>
        )
      })}
      <div className="studio-mock-locale-menu__divider" aria-hidden />
      <button
        type="button"
        role="option"
        aria-selected={episodeChainPreferred}
        className={`studio-mock-locale-option studio-mock-locale-option--text-only studio-mock-locale-option--toggle${episodeChainPreferred ? ' studio-mock-locale-option--active' : ''}`}
        onClick={() => {
          setEpisodeChainPreferred(!episodeChainPreferred)
          setOpen(false)
        }}
      >
        <span className="studio-mock-locale-option__text">
          {episodeChainPreferred ? '✓ ' : ''}
          {uiText('episodeChainToggle')}
        </span>
      </button>

      <div className="studio-mock-locale-menu__divider" aria-hidden />

      <details className="narrator-voice-details" open={embeddedInGeneratedDialog ? true : undefined}>
        <summary aria-label={uiText('narratorLangVoiceAria')}>
          <span className="narrator-voice-details__summary-left">
            <span className="narrator-voice-details__title">{uiText('narratorLangVoiceSectionTitle')}</span>
            <span className="narrator-voice-details__picked">
              {langRow.iso2 ? (
                <img
                  className="narrator-voice-details__flag"
                  src={`https://flagcdn.com/16x12/${langRow.iso2}.png`}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span aria-hidden>{langRow.flag}</span>
              )}{' '}
              {langRow.label}
              {Glyphs.space}
              {Glyphs.middot}
              {Glyphs.space}
              {uiText('narratorVoiceModeAuto')}
            </span>
          </span>
        </summary>
        <div className="narrator-voice-details__body">
          <div ref={narratorDropdownZoneRef} className="narrator-voice-details__dropdown-zone">
            <div className="narrator-voice-details__grid narrator-voice-details__grid--single">
              <label className="post-export-dock__field">
                <span>{uiText('language')}</span>
                <div className="narrator-voice-details__lang-picker">
                  <button
                    type="button"
                    className="select narrator-voice-details__lang-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={narratorDropdownOpen === 'language'}
                    onClick={() =>
                      setNarratorDropdownOpen((v) => (v === 'language' ? null : 'language'))
                    }
                  >
                    <span className="narrator-voice-details__lang-trigger-left">
                      {langRow.iso2 ? (
                        <img
                          className="narrator-voice-details__flag"
                          src={`https://flagcdn.com/16x12/${langRow.iso2}.png`}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span className="narrator-voice-details__flag-emoji" aria-hidden>
                          {langRow.flag}
                        </span>
                      )}
                      <span className="narrator-voice-details__lang-name">{langRow.label}</span>
                    </span>
                    <span aria-hidden>{Glyphs.caretDown}</span>
                  </button>
                  {narratorDropdownOpen === 'language' ? (
                    <div
                      className={`narrator-voice-details__lang-menu${embeddedInGeneratedDialog ? ' narrator-voice-details__lang-menu--push' : ''}`}
                      role="listbox"
                    >
                      {NARRATION_LANGS.map((x) => {
                        const selected = x.id === narration.languageId
                        return (
                          <button
                            key={x.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={`narrator-voice-details__lang-option${selected ? ' narrator-voice-details__lang-option--on' : ''}`}
                            onClick={() => {
                              setNarration({ ...narration, languageId: x.id as NarrationLanguageId })
                              setNarratorDropdownOpen(null)
                            }}
                          >
                            {x.iso2 ? (
                              <img
                                className="narrator-voice-details__flag"
                                src={`https://flagcdn.com/16x12/${x.iso2}.png`}
                                alt=""
                                loading="lazy"
                              />
                            ) : (
                              <span className="narrator-voice-details__flag-emoji" aria-hidden>
                                {x.flag}
                              </span>
                            )}
                            <span>{x.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </label>
            </div>

            <div className="narrator-voice-details__auto-summary">
              <div className="narrator-voice-details__readonly-row">
                <span className="narrator-voice-details__readonly-label">{uiText('narratorShortLabel')}</span>
                <span className="narrator-voice-details__readonly-value">{narratorPreset.displayName}</span>
              </div>
              <div className="narrator-voice-details__readonly-row">
                <span className="narrator-voice-details__readonly-label">{uiText('narratorVoiceModeLabel')}</span>
                <span className="narrator-voice-details__readonly-value">{uiText('narratorVoiceModeAuto')}</span>
              </div>
              <p className="narrator-voice-details__hint">{uiText('narratorAdaptiveVoiceHint')}</p>
            </div>
          </div>

          <div className="narrator-voice-details__actions">
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                runNarrationSpeechPreview(
                  narration,
                  {
                    onStart: () => setPreviewOn(true),
                    onEnd: () => setPreviewOn(false)
                  },
                  {
                    narratorId,
                    genre: backendGenre,
                    storyTone,
                    storyLanguage,
                    autoVoiceDirector: narration.autoVoiceDirector,
                    narratorGenderPreference: narration.narratorGenderPreference
                  }
                )
              }}
            >
              {uiText('narratorPreviewVoice')}
            </button>
          </div>

          {previewOn ? (
            <div className="narrator-voice-details__wave" aria-live="polite">
              <span className="narrator-voice-details__wave-label">{uiText('narratorWaveform')}</span>
              <VoiceReactiveBars active bars={7} />
            </div>
          ) : null}

          <div className="narrator-voice-details__toggle-list">
            <label className="narrator-voice-details__toggle">
              <input
                type="checkbox"
                checked={narration.autoVoiceDirector}
                onChange={(e) =>
                  setNarration({ ...narration, autoVoiceDirector: e.target.checked })
                }
              />
              {uiText('narratorAutoVoiceDirector')}
            </label>
            <label className="narrator-voice-details__toggle">
              <input
                type="checkbox"
                checked={narration.ai.autoTranslateToNarrationLanguage}
                onChange={(e) =>
                  setNarration({
                    ...narration,
                    ai: { ...narration.ai, autoTranslateToNarrationLanguage: e.target.checked }
                  })
                }
              />
              {uiText('narratorToggleAutoTranslate')}
            </label>
            <label className="narrator-voice-details__toggle">
              <input
                type="checkbox"
                checked={narration.ai.preserveOriginalProperNames}
                onChange={(e) =>
                  setNarration({
                    ...narration,
                    ai: { ...narration.ai, preserveOriginalProperNames: e.target.checked }
                  })
                }
              />
              {uiText('narratorTogglePreserveProperNames')}
            </label>
            <label className="narrator-voice-details__toggle">
              <input
                type="checkbox"
                checked={narration.ai.generateSubtitlesAutomatically}
                onChange={(e) =>
                  setNarration({
                    ...narration,
                    ai: { ...narration.ai, generateSubtitlesAutomatically: e.target.checked }
                  })
                }
              />
              {uiText('narratorToggleAutoSubtitles')}
            </label>
            <label className="narrator-voice-details__toggle">
              <input
                type="checkbox"
                checked={narration.ai.dualSubtitleMode}
                onChange={(e) =>
                  setNarration({
                    ...narration,
                    ai: { ...narration.ai, dualSubtitleMode: e.target.checked }
                  })
                }
              />
              {uiText('narratorToggleDualSubs')}
            </label>
            <label className="narrator-voice-details__toggle">
              <input
                type="checkbox"
                checked={narration.ai.lipSyncDialogueWithSelectedLanguage}
                onChange={(e) =>
                  setNarration({
                    ...narration,
                    ai: { ...narration.ai, lipSyncDialogueWithSelectedLanguage: e.target.checked }
                  })
                }
              />
              {uiText('narratorToggleLipSync')}
            </label>
            <label className="narrator-voice-details__toggle">
              <input
                type="checkbox"
                checked={narration.ai.multiNarratorMode}
                onChange={(e) =>
                  setNarration({
                    ...narration,
                    ai: { ...narration.ai, multiNarratorMode: e.target.checked }
                  })
                }
              />
              {uiText('narratorToggleMultiNarrator')}
            </label>
            <label className="narrator-voice-details__toggle">
              <input
                type="checkbox"
                checked={narration.ai.episodeNarratorConsistencyLock}
                onChange={(e) =>
                  setNarration({
                    ...narration,
                    ai: { ...narration.ai, episodeNarratorConsistencyLock: e.target.checked }
                  })
                }
              />
              {uiText('narratorToggleConsistencyLock')}
            </label>
          </div>
        </div>
      </details>
    </div>
  )

  if (embeddedInGeneratedDialog) {
    return <div className="story-gen-defaults-embedded">{menuEl}</div>
  }

  return (
    <div className="studio-mock-locale-picker studio-mock-locale-picker--gen-defaults" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="studio-mock-locale-trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={uiText('storyGenDefaultsAria')}
        title={detailTitle}
        onClick={() => {
          if (disabled) return
          if (onRequestOpenInGeneratedDialog) {
            onRequestOpenInGeneratedDialog()
            return
          }
          setOpen((v) => !v)
        }}
      >
        <span className="studio-mock-locale-trigger__name studio-mock-gen-defaults-trigger__label">
          {uiText('studioGeneratedScriptMore')}
        </span>
        <span className="studio-mock-locale-trigger__chev" aria-hidden>
          {Glyphs.caretDown}
        </span>
      </button>
      {open && portalHostEl ? createPortal(menuEl, portalHostEl) : open ? menuEl : null}
    </div>
  )
}
