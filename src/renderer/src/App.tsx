import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  STYLE_PRESETS,
  type VisualStyleId,
  type ProjectStatus,
  defaultProject
} from './types/story'
import { useStudioStore } from './store/useStudioStore'
import { useStoryGeneration } from './hooks/useStoryGeneration'
import { useLeonardo } from './hooks/useLeonardo'
import { recommendStyleFromIdea } from './prompts/storyEngine'
import { LANGUAGE_OPTIONS } from './i18n/resources'
import { suggestUiLanguageFromText } from './utils/detectLang'
import { useBackendGenerate } from './hooks/useBackendGenerate'

const STYLE_KEYS: Record<VisualStyleId, string> = {
  soft_anime_fantasy: 'styleSoftAnimeFantasy',
  cinematic_anime: 'styleCinematicAnime',
  comic_panel: 'styleComicPanel',
  dark_anime: 'styleDarkAnime',
  romantic_glow: 'styleRomanticGlow'
}

export default function App() {
  const { t, i18n } = useTranslation()
  const theme = useStudioStore((s) => s.theme)
  const setTheme = useStudioStore((s) => s.setTheme)
  const uiLanguage = useStudioStore((s) => s.uiLanguage)
  const setUiLanguage = useStudioStore((s) => s.setUiLanguage)
  const idea = useStudioStore((s) => s.idea)
  const setIdea = useStudioStore((s) => s.setIdea)
  const backendCountry = useStudioStore((s) => s.backendCountry)
  const backendTheme = useStudioStore((s) => s.backendTheme)
  const backendGenre = useStudioStore((s) => s.backendGenre)
  const backendLength = useStudioStore((s) => s.backendLength)
  const setBackendCountry = useStudioStore((s) => s.setBackendCountry)
  const setBackendTheme = useStudioStore((s) => s.setBackendTheme)
  const setBackendGenre = useStudioStore((s) => s.setBackendGenre)
  const setBackendLength = useStudioStore((s) => s.setBackendLength)
  const styleId = useStudioStore((s) => s.styleId)
  const setStyleId = useStudioStore((s) => s.setStyleId)
  const aspectMode = useStudioStore((s) => s.aspectMode)
  const setAspectMode = useStudioStore((s) => s.setAspectMode)
  const project = useStudioStore((s) => s.project)
  const setProject = useStudioStore((s) => s.setProject)
  const patchProject = useStudioStore((s) => s.patchProject)
  const busy = useStudioStore((s) => s.busy)
  const lastError = useStudioStore((s) => s.lastError)
  const setError = useStudioStore((s) => s.setError)
  const settingsOpen = useStudioStore((s) => s.settingsOpen)
  const setSettingsOpen = useStudioStore((s) => s.setSettingsOpen)
  const projectPickerOpen = useStudioStore((s) => s.projectPickerOpen)
  const setProjectPickerOpen = useStudioStore((s) => s.setProjectPickerOpen)
  const selectedEpisode = useStudioStore((s) => s.selectedEpisode)
  const setSelectedEpisode = useStudioStore((s) => s.setSelectedEpisode)
  const newBlankProject = useStudioStore((s) => s.newBlankProject)

  const { generateBible, generateEpisode, regenerateScene } = useStoryGeneration()
  const { generateCharacterBase } = useLeonardo()
  const { generate: backendGenerate } = useBackendGenerate()

  const [projectsMeta, setProjectsMeta] = useState<
    { id: string; title: string; status: string; updatedAt: string }[]
  >([])

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    void i18n.changeLanguage(uiLanguage)
    document.documentElement.lang = uiLanguage
  }, [i18n, uiLanguage])

  useEffect(() => {
    const fm = project?.fontMode ?? 'story'
    document.body.classList.remove('font-clean', 'font-story', 'font-comic')
    document.body.classList.add(`font-${fm}`)
  }, [project?.fontMode])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => {
      if (useStudioStore.getState().theme === 'system') {
        document.documentElement.setAttribute(
          'data-theme',
          mq.matches ? 'dark' : 'light'
        )
      }
    }
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const refreshProjects = async () => {
    const k = window.katha
    if (!k) return
    const list = await k.projectsList()
    setProjectsMeta(list)
  }

  useEffect(() => {
    void refreshProjects()
  }, [])

  const nextEpisodeNumber = useMemo(() => {
    if (!project?.bible) return 1
    const max = project.episodes.reduce((m, e) => Math.max(m, e.number), 0)
    return max + 1
  }, [project])

  const totalEpisodes = project?.bible?.totalEpisodes ?? 0

  const activeEpisode = useMemo(() => {
    if (!project || selectedEpisode == null) return null
    return project.episodes.find((e) => e.number === selectedEpisode) ?? null
  }, [project, selectedEpisode])

  const saveProject = async () => {
    const k = window.katha
    if (!k || !project) return
    await k.projectsSave({ ...project, updatedAt: new Date().toISOString() })
    await refreshProjects()
  }

  const loadProject = async (id: string) => {
    const k = window.katha
    if (!k) return
    const p = await k.projectsLoad(id)
    setProject(p)
    setProjectPickerOpen(false)
  }

  const deleteProject = async (id: string) => {
    const k = window.katha
    if (!k) return
    await k.projectsDelete(id)
    await refreshProjects()
    if (project?.id === id) {
      setProject(null)
    }
  }

  const onRecommendStyle = () => {
    setStyleId(recommendStyleFromIdea(idea))
  }

  const onIdeaBlur = () => {
    const s = suggestUiLanguageFromText(idea)
    if (s) setUiLanguage(s)
  }

  const statusLabel = (s: ProjectStatus) => {
    if (s === 'new') return t('statusNew')
    if (s === 'completed') return t('statusDone')
    return t('statusProgress')
  }

  const speechRef = useRef<{
    rec: any | null
    listening: boolean
  }>({ rec: null, listening: false })
  const [voiceListening, setVoiceListening] = useState(false)
  const ideaRef = useRef<HTMLTextAreaElement | null>(null)

  const canUseClipboard = typeof navigator !== 'undefined' && !!navigator.clipboard
  const canUseSpeech =
    typeof window !== 'undefined' &&
    (Boolean((window as any).SpeechRecognition) || Boolean((window as any).webkitSpeechRecognition))

  const copyIdea = useCallback(async () => {
    setError(null)
    try {
      const text = idea || ''
      if (canUseClipboard) {
        await navigator.clipboard.writeText(text)
        return
      }
      // Fallback for restricted browsers: select the textarea and use execCommand('copy').
      const el = ideaRef.current
      if (!el) throw new Error('Copy not available here. Use Ctrl+C or long‑press to copy.')
      el.focus()
      el.select()
      const ok = document.execCommand?.('copy')
      if (!ok) throw new Error('Copy blocked by browser. Use Ctrl+C or long‑press to copy.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [canUseClipboard, idea, setError])

  const pasteIntoIdea = useCallback(async () => {
    setError(null)
    try {
      if (canUseClipboard) {
        const text = await navigator.clipboard.readText()
        if (typeof text === 'string') setIdea(text)
        return
      }
      // Fallback: allow manual paste into a prompt (works on mobile / restricted clipboard permissions).
      const next = window.prompt('Paste text here')
      if (typeof next === 'string') setIdea(next)
    } catch (e) {
      // Common: clipboard read blocked unless user grants permission.
      const msg = e instanceof Error ? e.message : String(e)
      const next = window.prompt('Paste text here (browser blocked auto-paste)', '')
      if (typeof next === 'string') {
        setIdea(next)
      } else {
        setError(msg)
      }
    }
  }, [canUseClipboard, setError, setIdea])

  useEffect(() => {
    // On the web we want the browser's native right-click menu (copy/paste/select).
    // Only intercept contextmenu in Electron.
    const isElectron =
      typeof navigator !== 'undefined' &&
      typeof navigator.userAgent === 'string' &&
      navigator.userAgent.includes('Electron')
    if (!isElectron) return

    const onCtx = (e: MouseEvent) => {
      const k = window.katha
      if (!k?.uiShowContextMenu) return
      e.preventDefault()
      const target = e.target as HTMLElement | null
      const isEditable =
        !!target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target as any).isContentEditable === true)
      const selectionText = window.getSelection()?.toString() || ''
      void k.uiShowContextMenu({ isEditable, selectionText })
    }
    window.addEventListener('contextmenu', onCtx)
    return () => window.removeEventListener('contextmenu', onCtx)
  }, [])

  const toggleVoiceToIdea = async () => {
    setError(null)
    try {
      if (!canUseSpeech) throw new Error('Voice input not supported on this system')

      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!speechRef.current.rec) {
        const rec = new SR()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = uiLanguage || 'en'
        rec.onresult = (event: any) => {
          let interim = ''
          let finalText = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const r = event.results[i]
            const part = r[0]?.transcript || ''
            if (r.isFinal) finalText += part
            else interim += part
          }
          const next = (finalText || interim || '').trim()
          if (next) setIdea(next)
        }
        rec.onerror = (e: any) => {
          setVoiceListening(false)
          speechRef.current.listening = false
          setError(e?.error ? `Voice error: ${e.error}` : 'Voice error')
        }
        rec.onend = () => {
          setVoiceListening(false)
          speechRef.current.listening = false
        }
        speechRef.current.rec = rec
      }

      // Update language on each start (if user switches UI language).
      try {
        speechRef.current.rec.lang = uiLanguage || 'en'
      } catch {
        // ignore
      }

      if (speechRef.current.listening) {
        speechRef.current.rec.stop()
        speechRef.current.listening = false
        setVoiceListening(false)
      } else {
        speechRef.current.rec.start()
        speechRef.current.listening = true
        setVoiceListening(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="app-shell">
      <header className="head">
        <div className="brand">
          <div className="brand-text">
            <h1>{t('appTitle')}</h1>
            <span>{t('appSubtitle')}</span>
          </div>
        </div>
        <div className="toolbar">
          <select
            className="select"
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
            aria-label="Theme"
          >
            <option value="light">{t('themeLight')}</option>
            <option value="dark">{t('themeDark')}</option>
            <option value="system">{t('themeSystem')}</option>
          </select>
          <button type="button" className="btn btn-ghost" onClick={() => setSettingsOpen(true)}>
            {t('settings')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              void refreshProjects()
              setProjectPickerOpen(true)
            }}
          >
            {t('projects')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              newBlankProject()
              setError(null)
            }}
          >
            {t('newProject')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void refreshProjects()
              setProjectPickerOpen(true)
            }}
          >
            {t('continueProject')}
          </button>
        </div>
      </header>

      <main className="main">
        {lastError ? <div className="error-banner">{lastError}</div> : null}
        {busy ? <div className="busy-bar">{t('loading')} — {busy}</div> : null}

        <div className="panel" style={{ marginBottom: 14 }}>
          <h3>{t('style')}</h3>
          <div className="style-grid">
            {(Object.keys(STYLE_PRESETS) as VisualStyleId[]).map((id) => {
              const st = STYLE_PRESETS[id]
              return (
                <button
                  key={id}
                  type="button"
                  className={`style-card ${styleId === id ? 'selected' : ''}`}
                  style={{ backgroundImage: st.previewGradient }}
                  onClick={() => setStyleId(id)}
                >
                  {t(STYLE_KEYS[id])}
                </button>
              )
            })}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button type="button" className="btn btn-ghost btn-small" onClick={onRecommendStyle}>
              {t('recommendStyle')}
            </button>
          </div>
        </div>

        <div className="row" style={{ marginBottom: 14 }}>
          <div className="panel" style={{ flex: 1, minWidth: 200 }}>
            <h3>{t('language')}</h3>
            <select
              className="select"
              style={{ width: '100%' }}
              value={uiLanguage}
              onChange={(e) => setUiLanguage(e.target.value)}
            >
              <option value="en">{t('detectLanguage')} → English</option>
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="panel" style={{ flex: 1, minWidth: 200 }}>
            <h3>{t('aspectRatio')}</h3>
            <select
              className="select"
              style={{ width: '100%' }}
              value={aspectMode}
              onChange={(e) => setAspectMode(e.target.value as 'vertical_9_16' | 'horizontal_16_9')}
            >
              <option value="vertical_9_16">{t('vertical')}</option>
              <option value="horizontal_16_9">{t('horizontal')}</option>
            </select>
          </div>
          <div className="panel" style={{ flex: 1, minWidth: 200 }}>
            <h3>{t('fontClean')} / {t('fontStory')} / {t('fontComic')}</h3>
            <select
              className="select"
              style={{ width: '100%' }}
              value={project?.fontMode ?? 'story'}
              onChange={(e) => {
                const v = e.target.value as 'clean' | 'story' | 'comic'
                if (!project) {
                  setProject(defaultProject({ fontMode: v }))
                } else {
                  patchProject((p) => ({ ...p, fontMode: v }))
                }
              }}
            >
              <option value="clean">{t('fontClean')}</option>
              <option value="story">{t('fontStory')}</option>
              <option value="comic">{t('fontComic')}</option>
            </select>
          </div>
        </div>

        <div className="panel">
          <h3>{t('ideaPlaceholder')}</h3>
          <textarea
            className="idea-input"
            ref={ideaRef}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onBlur={onIdeaBlur}
            placeholder={t('ideaPlaceholder')}
          />
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className={`btn btn-small icon-btn ${voiceListening ? 'btn-voice-active' : 'btn-ghost'}`}
              disabled={Boolean(busy) || !canUseSpeech}
              onClick={() => void toggleVoiceToIdea()}
              title={canUseSpeech ? (voiceListening ? 'Stop voice input' : 'Voice to story') : 'Voice not supported'}
            >
              <span className="icon" aria-hidden>
                🎙
              </span>
              {voiceListening ? 'Listening…' : 'Voice'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              style={{ marginLeft: 8 }}
              disabled={Boolean(busy) || !idea}
              onClick={() => void copyIdea()}
              title={canUseClipboard ? 'Copy idea' : 'Copy (Ctrl+C)'}
            >
              Copy
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              style={{ marginLeft: 8 }}
              disabled={Boolean(busy)}
              onClick={() => void pasteIntoIdea()}
              title={canUseClipboard ? 'Paste into idea' : 'Paste (Ctrl+V)'}
            >
              Paste
            </button>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <input
              className="select"
              style={{ flex: 1, minWidth: 160 }}
              value={backendCountry}
              onChange={(e) => setBackendCountry(e.target.value)}
              placeholder="Country"
            />
            <select
              className="select"
              value={backendTheme}
              onChange={(e) => setBackendTheme(e.target.value)}
            >
              <option value="myth">myth</option>
              <option value="folklore">folklore</option>
              <option value="urban legend">urban legend</option>
              <option value="paranormal">paranormal</option>
            </select>
            <select
              className="select"
              value={backendGenre}
              onChange={(e) => setBackendGenre(e.target.value)}
            >
              <option value="horror">horror</option>
              <option value="mystery">mystery</option>
              <option value="love">love</option>
              <option value="supernatural">supernatural</option>
              <option value="thriller">thriller</option>
              <option value="drama">drama</option>
              <option value="adventure">adventure</option>
            </select>
            <select
              className="select"
              value={backendLength}
              onChange={(e) => setBackendLength(e.target.value)}
            >
              <option value="short">short</option>
              <option value="medium">medium</option>
              <option value="long">long</option>
            </select>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn"
              disabled={Boolean(busy)}
              onClick={() => void backendGenerate()}
            >
              {t('generateBible')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={Boolean(busy) || !project?.bible}
              onClick={() => void generateEpisode(1)}
            >
              {t('generateEpisode1')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={Boolean(busy) || !project?.bible || nextEpisodeNumber > totalEpisodes}
              onClick={() => void generateEpisode(nextEpisodeNumber)}
            >
              {t('continueNext')} ({nextEpisodeNumber}/{totalEpisodes || '—'})
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={Boolean(busy) || !project?.bible || totalEpisodes < 1}
              onClick={() => void generateEpisode(totalEpisodes)}
            >
              {t('continueFinal')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!project}
              onClick={() => {
                patchProject((p) => ({ ...p, status: 'completed' }))
                void saveProject()
              }}
            >
              {t('storyFinished')}
            </button>
            <button type="button" className="btn btn-ghost" disabled={!project} onClick={() => void saveProject()}>
              {t('saveProject')}
            </button>
          </div>
        </div>

        {project?.bible ? (
          <div className="panel" style={{ marginTop: 14 }}>
            <h3>{project.title}</h3>
            <div className="row">
              <span className="badge">{statusLabel(project.status)}</span>
              <span className="badge">
                {t('providerUsed')}: {project.bible.language} / {project.bible.aspectMode}
              </span>
            </div>
          </div>
        ) : null}

        {activeEpisode ? (
          <div className="panel" style={{ marginTop: 14 }}>
            <h3>
              Episode {activeEpisode.number} — {activeEpisode.pacing} — {activeEpisode.estimatedDurationSec}s
            </h3>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {activeEpisode.scenes.map((s) => (
                <li key={s.index} style={{ marginBottom: 8 }}>
                  <strong>{s.character}</strong>{' '}
                  <span className={s.lineType === 'Thought' ? 'thought' : ''}>
                    {s.lineType === 'Thought' ? '(thought)' : ':'} {s.text}{' '}
                    {s.emoji ? <span aria-hidden>{s.emoji}</span> : null}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    style={{ marginLeft: 8 }}
                    disabled={Boolean(busy)}
                    onClick={() => void regenerateScene(activeEpisode.number, s.index)}
                  >
                    {t('regenerateScene')}
                  </button>
                </li>
              ))}
            </ul>
            <p>
              <strong>Cliffhanger:</strong> {activeEpisode.cliffhanger}
            </p>
          </div>
        ) : null}
      </main>

      <aside className="side">
        <h3 style={{ margin: '4px 0 8px' }}>{t('storyMonitor')}</h3>
        {!project ? (
          <p style={{ color: 'var(--muted)' }}>{t('noProject')}</p>
        ) : (
          <>
            <div className="panel">
              <h3>{t('episodes')}</h3>
              {project.bible
                ? Array.from({ length: project.bible.totalEpisodes }, (_, i) => i + 1).map((n) => {
                    const ep = project.episodes.find((e) => e.number === n)
                    const done = Boolean(ep)
                    const current = selectedEpisode === n
                    return (
                      <div
                        key={n}
                        className={`episode-row ${done ? 'done' : ''} ${current ? 'current' : ''}`}
                        onClick={() => setSelectedEpisode(n)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedEpisode(n)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <span>
                          E{n} {ep ? `· ${ep.pacing}` : '· …'}
                        </span>
                        <span className="badge">{done ? 'done' : 'upcoming'}</span>
                      </div>
                    )
                  })
                : (
                  <span className="badge">{t('statusNew')}</span>
                )}
            </div>

            <div className="panel">
              <h3>{t('characters')}</h3>
              {project.bible?.characters.map((c) => (
                <div key={c.id} className="char-card">
                  {c.baseImageUrl ? (
                    <img src={c.baseImageUrl} alt={c.name} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--surface-2)' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{c.personality}</div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      style={{ marginTop: 6 }}
                      disabled={Boolean(busy)}
                      onClick={() => void generateCharacterBase(c.id)}
                    >
                      Leonardo: base portrait
                    </button>
                  </div>
                </div>
              )) ?? null}
            </div>

            <div className="panel">
              <h3>{t('continuity')}</h3>
              <pre className="script-pre" style={{ maxHeight: 120 }}>
                {project.memorySummary || '—'}
              </pre>
            </div>

            <div className="panel">
              <h3>{t('scriptPreview')}</h3>
              <pre className="script-pre">{activeEpisode?.rawStructured ?? '—'}</pre>
            </div>
          </>
        )}
      </aside>

      <footer className="foot">{t('footer')}</footer>

      {settingsOpen ? (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      ) : null}
      {projectPickerOpen ? (
        <ProjectPickerModal
          items={projectsMeta}
          onClose={() => setProjectPickerOpen(false)}
          onLoad={(id) => void loadProject(id)}
          onDelete={(id) => void deleteProject(id)}
        />
      ) : null}
    </div>
  )
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'online' | 'offline'>('offline')
  const [debug, setDebug] = useState<string>('')

  useEffect(() => {
    void (async () => {
      const k = window.katha
      if (!k) return
      const m = await k.settingsGetApiKeys()
      const hf = await k.settingsHasFileKeys()
      const hasAnyTextModel = Boolean(m.hasOpenAI || m.hasGemini || m.hasDeepSeek)
      setMode(hf && hasAnyTextModel ? 'online' : 'offline')
      if (!hf) {
        const d = await k.settingsDebugKeyPaths()
        const lines = [
          `has(openai)=${d.has.openai} has(gemini)=${d.has.gemini} has(deepseek)=${d.has.deepseek} has(leonardo)=${d.has.leonardo}`,
          ...d.candidates.map((c) => `${c.exists ? '✓' : '✗'} ${c.path}`)
        ]
        setDebug(lines.join('\n'))
      }
    })()
  }, [])

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t('settings')}</h2>
        <div className="panel" style={{ marginBottom: 12 }}>
          <h3>Mode</h3>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{mode === 'online' ? 'Online' : 'Offline'}</span>
            <span className="badge">{mode}</span>
          </div>
        </div>
        {mode === 'offline' && debug ? (
          <div className="panel" style={{ marginBottom: 12 }}>
            <h3>Key file search</h3>
            <pre className="script-pre" style={{ maxHeight: 160 }}>
              {debug}
            </pre>
          </div>
        ) : null}
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjectPickerModal({
  items,
  onClose,
  onLoad,
  onDelete
}: {
  items: { id: string; title: string; status: string; updatedAt: string }[]
  onClose: () => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t('projects')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No saved projects yet.</p>
          ) : (
            items.map((p) => (
              <div
                key={p.id}
                className="row"
                style={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {p.status} · {p.updatedAt?.slice(0, 10) ?? ''}
                  </div>
                </div>
                <div className="row">
                  <button type="button" className="btn btn-small" onClick={() => onLoad(p.id)}>
                    Open
                  </button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => onDelete(p.id)}>
                    {t('deleteProject')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 14 }} onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  )
}
