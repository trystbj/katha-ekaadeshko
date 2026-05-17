import { useEffect, useId, useMemo, useRef } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { ProjectState } from '../types/story'
import {
  buildStudioMonitorSearchResults,
  type StudioSearchResult
} from '../utils/studioMonitorSearch'
import { tEpisodePacing } from '../utils/i18nEpisodePacing'
import '../styles/studio-monitor-search.css'

type Props = {
  query: string
  onQueryChange: (q: string) => void
  onClose: () => void
  project: ProjectState | null
  historyRows: { id: string; title: string }[]
  cloudRows: { id: string; title: string }[]
  onPickEpisode: (episodeNumber: number) => void
  onPickBible: () => void
  onPickHistory: (id: string) => void
  onPickCloud: (id: string) => void
}

export function StudioMonitorSearch({
  query,
  onQueryChange,
  onClose,
  project,
  historyRows,
  cloudRows,
  onPickEpisode,
  onPickBible,
  onPickHistory,
  onPickCloud
}: Props) {
  const uiText = useUiText()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const id = useId()
  const inputId = `studio-monitor-search-${id}`

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const results = useMemo(
    () => buildStudioMonitorSearchResults(query, project, historyRows, cloudRows),
    [query, project, historyRows, cloudRows]
  )

  const grouped = useMemo(() => {
    const episodes: StudioSearchResult[] = []
    const bibles: StudioSearchResult[] = []
    const history: StudioSearchResult[] = []
    const cloud: StudioSearchResult[] = []
    for (const r of results) {
      if (r.kind === 'episode') episodes.push(r)
      else if (r.kind === 'bible') bibles.push(r)
      else if (r.kind === 'history') history.push(r)
      else if (r.kind === 'cloud') cloud.push(r)
    }
    return { episodes, bibles, history, cloud }
  }, [results])

  const q = query.trim()
  const showEmpty = q.length >= 1 && results.length === 0

  const renderRow = (key: string, title: string, snippet: string, onActivate: () => void) => (
    <button
      key={key}
      type="button"
      className="studio-monitor-search__row"
      onClick={() => {
        onActivate()
        onClose()
      }}
    >
      <span className="studio-monitor-search__row-title">{title}</span>
      {snippet ? <span className="studio-monitor-search__row-snippet">{snippet}</span> : null}
    </button>
  )

  return (
    <div className="studio-monitor-search" role="search">
      <div className="studio-monitor-search__toolbar">
        <button
          type="button"
          className="studio-monitor-search__back"
          onClick={onClose}
          aria-label={uiText('studioSearchClose')}
          title={uiText('studioSearchClose')}
        >
          {Glyphs.arrowLeft}
        </button>
        <label className="studio-monitor-search__label" htmlFor={inputId}>
          {uiText('studioSearchLabel')}
        </label>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        className="studio-monitor-search__input"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={uiText('studioSearchPlaceholder')}
        autoComplete="off"
        spellCheck={false}
      />
      {q.length < 1 ? (
        <p className="studio-monitor-search__hint">{uiText('studioSearchHintEmpty')}</p>
      ) : null}

      <div className="studio-monitor-search__results">
        {grouped.bibles.length > 0 ? (
          <>
            <h4 className="studio-monitor-search__section-title">{uiText('studioSearchSectionBible')}</h4>
            {grouped.bibles.map((r, i) =>
              r.kind === 'bible'
                ? renderRow(
                    `bib-${i}`,
                    r.bibleTitle?.trim() || uiText('studioSearchBibleFallbackTitle'),
                    r.snippet,
                    onPickBible
                  )
                : null
            )}
          </>
        ) : null}

        {grouped.episodes.length > 0 ? (
          <>
            <h4 className="studio-monitor-search__section-title">{uiText('studioSearchSectionEpisodes')}</h4>
            {grouped.episodes.map((r, i) =>
              r.kind === 'episode'
                ? renderRow(
                    `ep-${r.episodeNumber}-${i}`,
                    uiText('studioSearchEpisodeRow', {
                      n: r.episodeNumber,
                      pacing: tEpisodePacing(uiText, r.pacing)
                    }),
                    r.snippet,
                    () => onPickEpisode(r.episodeNumber)
                  )
                : null
            )}
          </>
        ) : null}

        {grouped.history.length > 0 ? (
          <>
            <h4 className="studio-monitor-search__section-title">{uiText('studioSearchSectionHistory')}</h4>
            {grouped.history.map((r, i) =>
              r.kind === 'history'
                ? renderRow(`hi-${r.projectId}-${i}`, r.title, r.snippet, () => onPickHistory(r.projectId))
                : null
            )}
          </>
        ) : null}

        {grouped.cloud.length > 0 ? (
          <>
            <h4 className="studio-monitor-search__section-title">{uiText('studioSearchSectionCloud')}</h4>
            {grouped.cloud.map((r, i) =>
              r.kind === 'cloud'
                ? renderRow(`cl-${r.projectId}-${i}`, r.title, r.snippet, () => onPickCloud(r.projectId))
                : null
            )}
          </>
        ) : null}

        {showEmpty ? <p className="studio-monitor-search__empty">{uiText('studioSearchNoResults')}</p> : null}
      </div>
    </div>
  )
}
