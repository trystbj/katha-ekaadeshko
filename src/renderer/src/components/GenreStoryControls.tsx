import type { ReactNode } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { useMemo } from 'react'
import {
  recommendGenreFromIdea,
  recommendLengthFromIdea,
  recommendStoryTypeFromIdea
} from '../prompts/storyEngine'

export const GENRES: { id: string; key: string }[] = [
  { id: 'mystery', key: 'genreMystery' },
  { id: 'horror', key: 'genreHorror' },
  { id: 'love', key: 'genreRomance' },
  { id: 'supernatural', key: 'genreSupernatural' },
  { id: 'thriller', key: 'genreThriller' },
  { id: 'drama', key: 'genreDrama' },
  { id: 'adventure', key: 'genreAdventure' },
  { id: 'fantasy', key: 'genreFantasy' },
  { id: 'sci-fi', key: 'genreSciFi' },
  { id: 'historical', key: 'genreHistorical' },
  { id: 'folklore', key: 'genreFolklore' },
  { id: 'comedy', key: 'genreComedy' },
  { id: 'crime', key: 'genreCrime' },
  { id: 'action', key: 'genreAction' },
  { id: 'slice-of-life', key: 'genreSliceOfLife' },
  { id: 'noir', key: 'genreNoir' },
  { id: 'young-adult', key: 'genreYoungAdult' }
]

export const STORY_TYPES: { id: string; key: string }[] = [
  { id: 'myth', key: 'storyTypeMyth' },
  { id: 'folklore', key: 'storyTypeFolklore' },
  { id: 'urban legend', key: 'storyTypeUrbanLegend' },
  { id: 'paranormal', key: 'storyTypeParanormal' }
]

export const LENGTHS: { id: string; key: string }[] = [
  { id: 'short', key: 'lengthShort' },
  { id: 'medium', key: 'lengthMedium' },
  { id: 'long', key: 'lengthLong' }
]

function GenreStripHeading({
  sidebar,
  spacing,
  children
}: {
  sidebar: boolean
  spacing: 'first' | 'mid'
  children: ReactNode
}) {
  if (sidebar) {
    return <div className="studio-mock-mini-h">{children}</div>
  }
  const margin =
    spacing === 'first' ? 'tw-mt-3 tw-mb-1' : 'tw-mt-2 tw-mb-1'
  return (
    <p
      className={`tw-text-[0.72rem] tw-font-semibold tw-tracking-wide tw-text-amber-200/80 ${margin}`}
    >
      {children}
    </p>
  )
}

type Props = {
  backendGenre: string
  setBackendGenre: (v: string) => void
  backendTheme: string
  setBackendTheme: (v: string) => void
  backendLength: string
  setBackendLength: (v: string) => void
  /** Compact chrome for the Style column sidebar */
  variant?: 'default' | 'studioSidebar'
}

export function GenreStoryControls({
  backendGenre,
  setBackendGenre,
  backendTheme,
  setBackendTheme,
  backendLength,
  setBackendLength,
  variant = 'default'
}: Props) {
  const uiText = useUiText()
  const sidebar = variant === 'studioSidebar'

  const inner = (
    <>
      <GenreStripHeading sidebar={sidebar} spacing="first">
        {sidebar ? uiText('studioSidebarGenre') : uiText('genreChipsLabel')}
      </GenreStripHeading>
      <div className="genre-strip">
        {GENRES.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`genre-chip ${backendGenre === g.id ? 'genre-chip--on' : ''}`}
            onClick={() => setBackendGenre(g.id)}
          >
            {uiText(g.key)}
          </button>
        ))}
      </div>
      <GenreStripHeading sidebar={sidebar} spacing="mid">
        {sidebar ? uiText('studioSidebarStoryVideo') : uiText('moodStoryTypeLabel')}
      </GenreStripHeading>
      <div className="genre-strip">
        {STORY_TYPES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`genre-chip ${backendTheme === s.id ? 'genre-chip--on' : ''}`}
            onClick={() => setBackendTheme(s.id)}
          >
            {uiText(s.key)}
          </button>
        ))}
      </div>
      <GenreStripHeading sidebar={sidebar} spacing="mid">
        {sidebar ? uiText('studioSidebarEpisodePacing') : uiText('episodeLengthLabel')}
      </GenreStripHeading>
      <div className="genre-strip">
        {LENGTHS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`genre-chip ${backendLength === l.id ? 'genre-chip--on' : ''}`}
            onClick={() => setBackendLength(l.id)}
          >
            {uiText(l.key)}
          </button>
        ))}
      </div>
    </>
  )

  if (sidebar) {
    return <div className="studio-mock-genre-controls">{inner}</div>
  }

  return <>{inner}</>
}

type StorySetupCollapsibleProps = {
  backendGenre: string
  setBackendGenre: (v: string) => void
  backendTheme: string
  setBackendTheme: (v: string) => void
  backendLength: string
  setBackendLength: (v: string) => void
  idea: string
}

const IDEA_MIN_FOR_HINT = 4

function SetupPickRow({
  sectionTitle,
  valueLabel,
  suggestedOptionLabel,
  selectionMatchesSuggestion,
  children
}: {
  sectionTitle: string
  valueLabel: string
  suggestedOptionLabel: string | null
  selectionMatchesSuggestion: boolean
  children: ReactNode
}) {
  const uiText = useUiText()
  const showDiff = Boolean(suggestedOptionLabel && !selectionMatchesSuggestion)
  const showMatch = Boolean(suggestedOptionLabel && selectionMatchesSuggestion)

  return (
    <details className="studio-mock-setup-row">
      <summary className="studio-mock-setup-row__summary">
        <div className="studio-mock-setup-row__summary-text">
          <span className="studio-mock-setup-row__title">{sectionTitle}</span>
          <span className="studio-mock-setup-row__picked">{valueLabel}</span>
          {showDiff ? (
            <span className="studio-mock-setup-row__suggested">
              {uiText('setupSuggestedOption', { option: suggestedOptionLabel })}
            </span>
          ) : null}
          {showMatch ? (
            <span className="studio-mock-setup-row__match">{uiText('matchesSuggestedChoice')}</span>
          ) : null}
        </div>
        <span className="studio-mock-setup-row__chevron" aria-hidden>
          {Glyphs.caretDown}
        </span>
      </summary>
      <div className="studio-mock-setup-row__body">
        <div className="genre-strip">{children}</div>
      </div>
    </details>
  )
}

/** Separate collapsible rows: collapsed shows title, current pick, optional seed suggestion, ▼; expanded lists chips. */
export function StorySetupCollapsible({
  backendGenre,
  setBackendGenre,
  backendTheme,
  setBackendTheme,
  backendLength,
  setBackendLength,
  idea
}: StorySetupCollapsibleProps) {
  const uiText = useUiText()
  const seed = idea.trim()

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

  const recGenreId = useMemo(
    () => (seed.length >= IDEA_MIN_FOR_HINT ? recommendGenreFromIdea(seed) : null),
    [seed]
  )
  const recThemeId = useMemo(
    () => (seed.length >= IDEA_MIN_FOR_HINT ? recommendStoryTypeFromIdea(seed) : null),
    [seed]
  )
  const recLengthId = useMemo(
    () => (seed.length >= IDEA_MIN_FOR_HINT ? recommendLengthFromIdea(seed) : null),
    [seed]
  )

  const recGenreLabel = useMemo(() => {
    if (!recGenreId) return null
    const g = GENRES.find((x) => x.id === recGenreId)
    return g ? uiText(g.key) : recGenreId
  }, [recGenreId, uiText])

  const recThemeLabel = useMemo(() => {
    if (!recThemeId) return null
    const s = STORY_TYPES.find((x) => x.id === recThemeId)
    return s ? uiText(s.key) : recThemeId
  }, [recThemeId, uiText])

  const recLengthLabel = useMemo(() => {
    if (!recLengthId) return null
    const l = LENGTHS.find((x) => x.id === recLengthId)
    return l ? uiText(l.key) : recLengthId
  }, [recLengthId, uiText])

  return (
    <div className="studio-mock-setup-stack">
      <SetupPickRow
        sectionTitle={uiText('studioSidebarGenre')}
        valueLabel={genreLabel}
        suggestedOptionLabel={recGenreLabel}
        selectionMatchesSuggestion={Boolean(recGenreId && recGenreId === backendGenre)}
      >
        {GENRES.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`genre-chip ${backendGenre === g.id ? 'genre-chip--on' : ''}`}
            onClick={() => setBackendGenre(g.id)}
          >
            {uiText(g.key)}
          </button>
        ))}
      </SetupPickRow>

      <SetupPickRow
        sectionTitle={uiText('studioSidebarStoryVideo')}
        valueLabel={themeLabel}
        suggestedOptionLabel={recThemeLabel}
        selectionMatchesSuggestion={Boolean(recThemeId && recThemeId === backendTheme)}
      >
        {STORY_TYPES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`genre-chip ${backendTheme === s.id ? 'genre-chip--on' : ''}`}
            onClick={() => setBackendTheme(s.id)}
          >
            {uiText(s.key)}
          </button>
        ))}
      </SetupPickRow>

      <SetupPickRow
        sectionTitle={uiText('studioSidebarEpisodePacing')}
        valueLabel={lengthLabel}
        suggestedOptionLabel={recLengthLabel}
        selectionMatchesSuggestion={Boolean(recLengthId && recLengthId === backendLength)}
      >
        {LENGTHS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`genre-chip ${backendLength === l.id ? 'genre-chip--on' : ''}`}
            onClick={() => setBackendLength(l.id)}
          >
            {uiText(l.key)}
          </button>
        ))}
      </SetupPickRow>
    </div>
  )
}
