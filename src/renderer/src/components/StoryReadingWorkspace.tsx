import { useCallback, useMemo, useRef, useState } from 'react'
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
  const rootRef = useRef<HTMLDivElement>(null)
  const translateBtnRef = useRef<HTMLButtonElement>(null)

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
    <div ref={rootRef} className="story-reading-workspace">
      <div className="story-reading-workspace__scroll">
        <header className="story-reading-workspace__header">
          <h2 className="story-reading-workspace__title">{model.title}</h2>
          {model.episodeLabel ? (
            <p className="story-reading-workspace__episode">{model.episodeLabel}</p>
          ) : null}
          {viewLang !== 'en' && activeLang ? (
            <p className="story-reading-workspace__lang-badge" role="status">
              {uiText('storyReadingTranslatedView', { language: activeLang.label })}
            </p>
          ) : null}
        </header>

        {model.summary && model.summary !== displayBody ? (
          <section className="story-reading-workspace__section">
            <h3 className="story-reading-workspace__label">{uiText('storyReadingSummary')}</h3>
            <p className="story-reading-workspace__prose">{model.summary}</p>
          </section>
        ) : null}

        <dl className="story-reading-workspace__meta">
          {model.genre ? (
            <>
              <dt>{uiText('storyReadingGenre')}</dt>
              <dd>{model.genre}</dd>
            </>
          ) : null}
          {model.length ? (
            <>
              <dt>{uiText('storyReadingLength')}</dt>
              <dd>{model.length}</dd>
            </>
          ) : null}
          {model.setting && model.setting !== model.summary && model.setting !== displayBody ? (
            <>
              <dt>{uiText('storyReadingSetting')}</dt>
              <dd>{model.setting}</dd>
            </>
          ) : null}
        </dl>

        <section className="story-reading-workspace__section">
          <h3 className="story-reading-workspace__label">{uiText('storyReadingFullStory')}</h3>
          <div className="story-reading-workspace__prose story-reading-workspace__prose--body">
            {paragraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>

        {model.characters.length ? (
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
        ) : null}
      </div>

      {translateError ? (
        <p className="story-reading-workspace__error" role="alert">
          {translateError}
        </p>
      ) : null}

      <div className="story-reading-workspace__actions">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => void onCopy()}>
          {copied ? uiText('storyActionCopied') : uiText('storyActionCopy')}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={onDownload}>
          {uiText('storyActionDownload')}
        </button>
        <button
          type="button"
          ref={translateBtnRef}
          className="btn btn-ghost btn-small story-reading-workspace__translate-btn"
          aria-expanded={translateOpen}
          aria-haspopup="dialog"
          onClick={() => setTranslateOpen((v) => !v)}
        >
          <span className="story-reading-workspace__translate-icon" aria-hidden>
            🌐
          </span>
          {uiText('storyActionTranslate')}
        </button>
      </div>

      <StoryTranslateModal
        open={translateOpen}
        busy={translateBusy}
        activeCode={viewLang}
        anchorRef={translateBtnRef}
        portalWrapRef={rootRef}
        onClose={() => setTranslateOpen(false)}
        onTranslate={(code) => void onTranslate(code)}
      />
    </div>
  )
}
