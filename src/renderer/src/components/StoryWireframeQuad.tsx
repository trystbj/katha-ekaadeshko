import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { NarratorUiPreset } from '../constants/narrators'
import { NARRATOR_UI_PRESETS, normalizeNarratorId } from '../constants/narrators'
import { GENRES, LENGTHS, STORY_TYPES } from './GenreStoryControls'
import { NarratorAvatar } from './NarratorAvatar'
import { NarratorPlaySample } from './NarratorPlaySample'

type Props = {
  backendGenre: string
  setBackendGenre: (v: string) => void
  backendTheme: string
  setBackendTheme: (v: string) => void
  backendLength: string
  setBackendLength: (v: string) => void
  narratorId: string
  onSelectNarrator: (id: string) => void
}

export type WireframeSetupSlotKey = 'genre' | 'type' | 'length' | 'narrator'

function NarratorSelectedProfileStrip({
  narratorPreset,
  narratorId,
  narrationLabel
}: {
  narratorPreset: NarratorUiPreset
  narratorId: string
  narrationLabel: string
}) {
  const uiText = useUiText()
  return (
    <section className="studio-mock-wireframe-narrator-below" aria-label={narrationLabel}>
      <div className="studio-mock-narration-profile studio-mock-narration-profile--below-grid">
        <NarratorAvatar preset={narratorPreset} selected />
        <div className="studio-mock-narration-profile__meta" aria-live="polite">
          <div className="studio-mock-narration-profile__title-row">
            <span className="studio-mock-narration-profile__name">{narratorPreset.displayName}</span>
            <span className="studio-mock-narration-profile__gender">
              {narratorPreset.gender === 'female' ? uiText('narratorFemale') : uiText('narratorMale')}
            </span>
          </div>
          <p className="studio-mock-narration-profile__vocal-types">
            <span className="studio-mock-narration-profile__vocal-label">{uiText('narratorVocalTypesLabel')}</span>
            {uiText(narratorPreset.descriptorKey)}
          </p>
        </div>
        <div className="studio-mock-narration-profile__preview">
          <NarratorPlaySample narratorId={narratorId} compact />
        </div>
      </div>
    </section>
  )
}

function Slot({
  slotKey,
  summaryLabel,
  valueLabel,
  children,
  gridAreaClass,
  openSlot,
  setOpenSlot
}: {
  slotKey: 'genre' | 'type' | 'length'
  summaryLabel: string
  valueLabel: string
  children: ReactNode
  gridAreaClass: string
  openSlot: WireframeSetupSlotKey | null
  setOpenSlot: Dispatch<SetStateAction<WireframeSetupSlotKey | null>>
}) {
  return (
    <details
      className={`studio-mock-wireframe-slot ${gridAreaClass}`}
      open={openSlot === slotKey}
      onToggle={(e) => {
        const el = e.currentTarget
        if (el.open) setOpenSlot(slotKey)
        else setOpenSlot(null)
      }}
    >
      <summary
        className="studio-mock-wireframe-slot__summary"
        aria-label={`${summaryLabel}: ${valueLabel}`}
      >
        <span className="studio-mock-wireframe-slot__label">{summaryLabel}</span>
        <span className="studio-mock-wireframe-slot__value">{valueLabel}</span>
        <span className="studio-mock-wireframe-slot__chev" aria-hidden>
          {Glyphs.caretDown}
        </span>
      </summary>
      <div className="studio-mock-wireframe-slot__body">
        <div className="genre-strip genre-strip--wireframe-slot genre-strip--wireframe-plain">{children}</div>
      </div>
    </details>
  )
}

export function StoryWireframeQuad({
  backendGenre,
  setBackendGenre,
  backendTheme,
  setBackendTheme,
  backendLength,
  setBackendLength,
  narratorId,
  onSelectNarrator
}: Props) {
  const uiText = useUiText()
  const [openSlot, setOpenSlot] = useState<WireframeSetupSlotKey | null>(null)

  const genreLabel = useMemo(() => {
    const g = GENRES.find((x) => x.id === backendGenre)
    return g ? uiText(g.key) : backendGenre
  }, [backendGenre, uiText])

  const themeLabel = useMemo(() => {
    const s = STORY_TYPES.find((x) => x.id === backendTheme)
    return s ? uiText(s.key) : backendTheme
  }, [backendTheme, uiText])

  const lengthLabel = useMemo(() => {
    const l = LENGTHS.find((x) => x.id === backendLength)
    return l ? uiText(l.key) : backendLength
  }, [backendLength, uiText])

  const narratorCanon = useMemo(() => normalizeNarratorId(narratorId), [narratorId])
  const narratorPreset = useMemo(
    () => NARRATOR_UI_PRESETS.find((n) => n.id === narratorCanon) ?? NARRATOR_UI_PRESETS[0],
    [narratorCanon]
  )

  const narrationLabel = uiText('narrationModeLabel')

  const quadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openSlot === null) return
    const onDocPointerDown = (e: MouseEvent | PointerEvent) => {
      const root = quadRef.current
      if (!root) return
      const n = e.target
      if (n instanceof Node && root.contains(n)) return
      setOpenSlot(null)
    }
    document.addEventListener('pointerdown', onDocPointerDown, true)
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true)
  }, [openSlot])

  return (
    <div ref={quadRef} className="studio-mock-wireframe-column-shell">
    <div className="studio-mock-wireframe-quad studio-mock-wireframe-quad--nolabels">
      <Slot
        slotKey="genre"
        gridAreaClass="studio-mock-wireframe-slot--area-genre"
        summaryLabel={uiText('wireframeSlotGenre')}
        valueLabel={genreLabel}
        openSlot={openSlot}
        setOpenSlot={setOpenSlot}
      >
        {GENRES.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`genre-chip ${backendGenre === g.id ? 'genre-chip--on' : ''}`}
            onClick={() => {
              setBackendGenre(g.id)
              setOpenSlot(null)
            }}
          >
            {uiText(g.key)}
          </button>
        ))}
      </Slot>

      <Slot
        slotKey="type"
        gridAreaClass="studio-mock-wireframe-slot--area-type"
        summaryLabel={uiText('wireframeSlotType')}
        valueLabel={themeLabel}
        openSlot={openSlot}
        setOpenSlot={setOpenSlot}
      >
        {STORY_TYPES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`genre-chip ${backendTheme === s.id ? 'genre-chip--on' : ''}`}
            onClick={() => {
              setBackendTheme(s.id)
              setOpenSlot(null)
            }}
          >
            {uiText(s.key)}
          </button>
        ))}
      </Slot>

      <Slot
        slotKey="length"
        gridAreaClass="studio-mock-wireframe-slot--area-length"
        summaryLabel={uiText('wireframeSlotLength')}
        valueLabel={lengthLabel}
        openSlot={openSlot}
        setOpenSlot={setOpenSlot}
      >
        {LENGTHS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`genre-chip ${backendLength === l.id ? 'genre-chip--on' : ''}`}
            onClick={() => {
              setBackendLength(l.id)
              setOpenSlot(null)
            }}
          >
            {uiText(l.key)}
          </button>
        ))}
      </Slot>

      <details
        className="studio-mock-wireframe-slot studio-mock-wireframe-slot--area-lang"
        open={openSlot === 'narrator'}
        onToggle={(e) => {
          const el = e.currentTarget
          if (el.open) setOpenSlot('narrator')
          else setOpenSlot(null)
        }}
      >
        <summary
          className="studio-mock-wireframe-slot__summary"
          aria-label={`${narrationLabel}: ${narratorPreset.displayName}`}
        >
          <span className="studio-mock-wireframe-slot__label">{narrationLabel}</span>
          <span className="studio-mock-wireframe-slot__value">{narratorPreset.displayName}</span>
          <span className="studio-mock-wireframe-slot__chev" aria-hidden>
            {Glyphs.caretDown}
          </span>
        </summary>
        <div className="studio-mock-wireframe-slot__body studio-mock-narration-slot__body studio-mock-narration-slot__body--voice-picker-only">
          <div
            className="genre-strip genre-strip--wireframe-slot genre-strip--wireframe-plain"
            role="listbox"
            aria-label={narrationLabel}
          >
            {NARRATOR_UI_PRESETS.map((n) => (
              <button
                key={n.id}
                type="button"
                role="option"
                aria-selected={narratorCanon === n.id}
                className={`genre-chip ${narratorCanon === n.id ? 'genre-chip--on' : ''}`}
                onClick={() => {
                  onSelectNarrator(n.id)
                  setOpenSlot(null)
                }}
              >
                {n.displayName}
              </button>
            ))}
          </div>
        </div>
      </details>
    </div>
    <NarratorSelectedProfileStrip
      narratorPreset={narratorPreset}
      narratorId={narratorCanon}
      narrationLabel={narrationLabel}
    />
    <div className="studio-mock-copyright-stamp studio-mock-copyright-stamp--in-column" role="contentinfo">
      <span className="studio-mock-copyright-stamp__line">{uiText('studioFooterWireframeAttribution')}</span>
      <span className="studio-mock-copyright-stamp__rights">{uiText('studioFooterAllRightsReserved')}</span>
    </div>
    <div className="studio-mock-style-trailing-spacer" aria-hidden="true" />
    </div>
  )
}
