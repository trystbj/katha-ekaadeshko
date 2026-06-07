import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { useStudioStore } from '../store/useStudioStore'
import type { ProjectState, StoryEpisode } from '../types/story'
import {
  buildStoryExportText,
  downloadStoryText,
  extractStoryReadingModel,
  splitStoryParagraphs
} from '../utils/storyReadingModel'
import { fetchStoryTranslation } from '../utils/storyTranslate'
import {
  storyTranslationLanguageByCode,
  type StoryTranslationLangCode
} from '../utils/storyTranslationLanguages'
import { StoryTranslateModal } from './StoryTranslateModal'
import '../styles/story-reading-workspace.css'

type Props = {
  project: ProjectState | null
  episode: StoryEpisode | null | undefined
}

export function StoryReadingWorkspace({ project, episode }: Props) {
  const uiText = useUiText()
  const patchProject = useStudioStore((s) => s.patchProject)
  const scrollRef = useRef<HTMLDivElement>(null)

  const model = useMemo(() => extractStoryReadingModel(project, episode), [project, episode])
  const [viewLang, setViewLang] = useState<StoryTranslationLangCode>('en')
  const [translateOpen, setTranslateOpen] = useState(false)
  const [translateBusy, setTranslateBusy] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const cachedTranslations = project?.storyTranslations ?? {}

  const activeLang = storyTranslationLanguageByCode(viewLang)
  const displayBody =
    viewLang === 'en'
      ? model?.fullStory ?? ''
      : cachedTranslations[viewLang] || model?.fullStory || ''

  const exportText = useMemo(() => {
    if (!model) return ''
    return buildStoryExportText(model, {
      languageLabel: viewLang === 'en' ? undefined : activeLang?.label,
      bodyOverride: displayBody
    })
  }, [model, viewLang, activeLang?.label, displayBody])

  const paragraphs = useMemo(() => splitStoryParagraphs(displayBody), [displayBody])

  const metaParts = useMemo(() => {
    if (!model) return []
    const parts: string[] = []
    if (model.genre) parts.push(model.genre)
    if (project?.bible?.styleId) parts.push(String(project.bible.styleId).replace(/_/g, ' '))
    if (model.length) parts.push(model.length)
    return parts
  }, [model, project?.bible?.styleId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !project?.id) return
    const key = `katha_story_scroll_${project.id}`
    try {
      const saved = sessionStorage.getItem(key)
      if (saved) el.scrollTop = Number(saved)
    } catch {
      /* ignore */
    }
    const save = () => {
      try {
        sessionStorage.setItem(key, String(el.scrollTop))
      } catch {
        /* ignore */
      }
    }
    el.addEventListener('scroll', save, { passive: true })
    return () => el.removeEventListener('scroll', save)
  }, [project?.id])

  const onCopy = useCallback(async () => {
    if (!exportText) return
    try {
      await navigator.clipboard.writeText(exportText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setTranslateError(uiText('storyCopyFailed'))
    }
  }, [exportText, uiText])

  const onDownload = useCallback(() => {
    if (!exportText || !model) return
    const slug = model.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 48) || 'story'
    const langSuffix = viewLang === 'en' ? '' : `-${viewLang}`
    downloadStoryText(`katha-story-${slug}${langSuffix}.txt`, exportText)
  }, [exportText, model, viewLang])

  const onTranslate = useCallback(
    async (code: StoryTranslationLangCode) => {
      if (!model || !project) return
      setTranslateError(null)

      if (code === 'en') {
        setViewLang('en')
        setTranslateOpen(false)
        return
      }

      const cached = cachedTranslations[code]
      if (cached?.trim()) {
        setViewLang(code)
        setTranslateOpen(false)
        return
      }

      const lang = storyTranslationLanguageByCode(code)
      if (!lang) return

      setTranslateBusy(true)
      try {
        const translated = await fetchStoryTranslation({
          text: model.fullStory,
          targetLanguage: lang.apiName,
          sourceLanguage: 'English'
        })
        patchProject((p) => ({
          ...p,
          storyTranslations: {
            ...(p.storyTranslations ?? {}),
            [code]: translated
          },
          updatedAt: new Date().toISOString()
        }))
        setViewLang(code)
        setTranslateOpen(false)
      } catch (e) {
        setTranslateError(e instanceof Error ? e.message : uiText('storyTranslateFailed'))
      } finally {
        setTranslateBusy(false)
      }
    },
    [model, project, cachedTranslations, patchProject, uiText]
  )

  if (!model) {
    return (
      <div className="story-reading-workspace story-reading-workspace--empty">
        <p className="story-reading-workspace__empty">{uiText('storyReadingEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="story-reading-workspace">
      <div ref={scrollRef} className="story-reading-workspace__scroll">
        <div className="story-reading-workspace__article">
          <header className="story-reading-workspace__header">
            <h2 className="story-reading-workspace__title">{model.title}</h2>
            {model.episodeLabel ? (
              <p className="story-reading-workspace__episode">{model.episodeLabel}</p>
            ) : null}
            {metaParts.length ? (
              <p className="story-reading-workspace__meta-line">{metaParts.join(' · ')}</p>
            ) : null}
            {viewLang !== 'en' && activeLang ? (
              <p className="story-reading-workspace__lang-badge" role="status">
                {uiText('storyReadingTranslatedView', { language: activeLang.label })}
              </p>
            ) : null}
          </header>

          <hr className="story-reading-workspace__rule" aria-hidden />

          {model.summary && model.summary !== displayBody ? (
            <section className="story-reading-workspace__section">
              <h3 className="story-reading-workspace__label">{uiText('storyReadingSummary')}</h3>
              <p className="story-reading-workspace__prose">{model.summary}</p>
            </section>
          ) : null}

          <section className="story-reading-workspace__section story-reading-workspace__section--body">
            <div className="story-reading-workspace__prose story-reading-workspace__prose--body">
              {paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          {model.setting && model.setting !== model.summary && model.setting !== displayBody ? (
            <>
              <hr className="story-reading-workspace__rule" aria-hidden />
              <section className="story-reading-workspace__section">
                <h3 className="story-reading-workspace__label">{uiText('storyReadingSetting')}</h3>
                <p className="story-reading-workspace__prose">{model.setting}</p>
              </section>
            </>
          ) : null}

          {model.characters.length ? (
            <>
              <hr className="story-reading-workspace__rule" aria-hidden />
              <section className="story-reading-workspace__section">
                <h3 className="story-reading-workspace__label">{uiText('storyReadingCharacters')}</h3>
                <ul className="story-reading-workspace__characters">
                  {model.characters.map((c) => (
                    <li key={c.name}>
                      <span className="story-reading-workspace__char-name">{c.name}</span>
                      {c.role ? <span className="story-reading-workspace__char-role">{c.role}</span> : null}
                      {c.traits ? (
                        <span className="story-reading-workspace__char-traits">{c.traits}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
        </div>
      </div>

      {translateError ? (
        <p className="story-reading-workspace__error" role="alert">
          {translateError}
        </p>
      ) : null}

      <div className="story-reading-workspace__actions">
        <button type="button" className="story-reading-workspace__action" onClick={() => void onCopy()}>
          {copied ? uiText('storyActionCopied') : uiText('storyActionCopy')}
        </button>
        <button type="button" className="story-reading-workspace__action" onClick={onDownload}>
          {uiText('storyActionDownload')}
        </button>
        <button type="button" className="story-reading-workspace__action" onClick={() => setTranslateOpen(true)}>
          {uiText('storyActionTranslate')}
        </button>
      </div>

      <StoryTranslateModal
        open={translateOpen}
        busy={translateBusy}
        activeCode={viewLang}
        onClose={() => setTranslateOpen(false)}
        onTranslate={(code) => void onTranslate(code)}
      />
    </div>
  )
}
