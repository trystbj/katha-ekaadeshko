import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAppI18n } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import {
  guideSectionsForUiLanguage,
  guideSectionSearchBlob,
  type GuideBlock,
  type GuideSection
} from '../content/userGuideSections'
import '../styles/saved-projects-window.css'
import '../styles/monitor-user-guide.css'

type Props = {
  onBack: () => void
}

function renderBlock(b: GuideBlock, key: string) {
  switch (b.type) {
    case 'p':
      return (
        <p key={key} className="monitor-user-guide__p">
          {b.text}
        </p>
      )
    case 'h4':
      return (
        <h4 key={key} className="monitor-user-guide__h4">
          {b.text}
        </h4>
      )
    case 'ul':
      return (
        <ul key={key} className="monitor-user-guide__ul">
          {b.items.map((item, i) => (
            <li key={i} className="monitor-user-guide__li">
              {item}
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol key={key} className="monitor-user-guide__ol">
          {b.items.map((item, i) => (
            <li key={i} className="monitor-user-guide__li">
              {item}
            </li>
          ))}
        </ol>
      )
    default:
      return null
  }
}

export function MonitorUserGuide({ onBack }: Props) {
  const { uiText, i18n } = useAppI18n()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  const sections = useMemo(
    () => guideSectionsForUiLanguage(i18n.resolvedLanguage || i18n.language),
    [i18n.resolvedLanguage, i18n.language]
  )

  useLayoutEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const tmr = window.setTimeout(() => setDebouncedQ(query.trim()), 320)
    return () => window.clearTimeout(tmr)
  }, [query])

  const tokens = useMemo(() => {
    const q = debouncedQ.toLowerCase()
    return q.split(/\s+/).filter(Boolean)
  }, [debouncedQ])

  const matchFlags = useMemo(() => {
    return sections.map((section) => {
      if (tokens.length === 0) return true
      const blob = guideSectionSearchBlob(section)
      return tokens.every((tok) => blob.includes(tok))
    })
  }, [tokens, sections])

  const anyMatch = tokens.length === 0 || matchFlags.some(Boolean)

  const scrollToFirstHit = useCallback(() => {
    if (tokens.length === 0) return
    const idx = matchFlags.findIndex(Boolean)
    if (idx < 0) return
    const id = sections[idx]?.id
    if (!id) return
    window.requestAnimationFrame(() => {
      document.getElementById(`guide-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [matchFlags, tokens.length, sections])

  useEffect(() => {
    scrollToFirstHit()
  }, [debouncedQ, scrollToFirstHit])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      scrollToFirstHit()
    }
  }

  const searchInputId = 'monitor-user-guide-search'

  return (
    <div className="saved-projects-window saved-projects-window--monitor monitor-user-guide">
      <header className="saved-projects-window__head monitor-settings-panel__head">
        <div className="saved-projects-window__head-main">
          <button
            type="button"
            className="saved-projects-window__back"
            aria-label={uiText('helpCenterBackSettings')}
            title={uiText('helpCenterBackSettings')}
            onClick={onBack}
          >
            {Glyphs.arrowLeft}
          </button>
          <div>
            <h1 className="saved-projects-window__title">{uiText('helpCenterTitle')}</h1>
          </div>
        </div>
      </header>

      <div className="monitor-user-guide__toolbar">
        <label className="monitor-user-guide__search-label" htmlFor={searchInputId}>
          {uiText('helpCenterSearchPlaceholder')}
        </label>
        <input
          ref={searchInputRef}
          id={searchInputId}
          type="search"
          className="monitor-user-guide__search-input"
          placeholder={uiText('helpCenterSearchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKeyDown}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="monitor-user-guide__hint">{uiText('helpCenterSearchHint')}</p>
      </div>

      <div className="monitor-user-guide__scroll" tabIndex={0}>
        {!anyMatch ? <p className="monitor-user-guide__nomatch">{uiText('helpCenterNoMatch')}</p> : null}
        {sections.map((section: GuideSection, i: number) => {
          const hit = tokens.length > 0 && matchFlags[i]
          return (
            <section
              key={section.id}
              id={`guide-section-${section.id}`}
              className={`monitor-user-guide__section${hit ? ' monitor-user-guide__section--hit' : ''}`}
              aria-labelledby={`guide-h-${section.id}`}
            >
              <h2 id={`guide-h-${section.id}`} className="monitor-user-guide__section-title">
                {section.title}
              </h2>
              {section.blocks.map((b, j) => renderBlock(b, `${section.id}-${j}`))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
