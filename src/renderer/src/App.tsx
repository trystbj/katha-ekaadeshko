import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  STYLE_PRESETS,
  type VisualStyleId,
  type ProjectStatus,
  type ProjectState,
  defaultProject
} from './types/story'
import { useStudioStore } from './store/useStudioStore'
import { useStoryGeneration } from './hooks/useStoryGeneration'
import { useLeonardo } from './hooks/useLeonardo'
import { recommendStyleFromIdea } from './prompts/storyEngine'
import { LANGUAGE_OPTIONS } from './i18n/resources'
import { suggestUiLanguageFromText } from './utils/detectLang'
import { useBackendGenerate } from './hooks/useBackendGenerate'
import { pushStoryToHistory } from './utils/storyHistory'

const STYLE_KEYS: Record<VisualStyleId, string> = {
  soft_anime_fantasy: 'styleSoftAnimeFantasy',
  cinematic_anime: 'styleCinematicAnime',
  comic_panel: 'styleComicPanel',
  dark_anime: 'styleDarkAnime',
  romantic_glow: 'styleRomanticGlow'
}

/** Prefer scene/background stills; fall back to character portraits for slideshow render. */
function collectRenderImageUrls(project: ProjectState | null): string[] {
  if (!project?.assets?.length) return []
  const withUrl = project.assets.filter(
    (a): a is (typeof a & { url: string }) => typeof a.url === 'string' && a.url.length > 0
  )
  const sceneBg = withUrl.filter((a) => a.kind === 'scene' || a.kind === 'background').map((a) => a.url)
  if (sceneBg.length) return sceneBg
  return withUrl.filter((a) => a.kind === 'character').map((a) => a.url)
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
  const job = useStudioStore((s) => s.job)
  const settingsOpen = useStudioStore((s) => s.settingsOpen)
  const setSettingsOpen = useStudioStore((s) => s.setSettingsOpen)
  const projectPickerOpen = useStudioStore((s) => s.projectPickerOpen)
  const setProjectPickerOpen = useStudioStore((s) => s.setProjectPickerOpen)
  const selectedEpisode = useStudioStore((s) => s.selectedEpisode)
  const setSelectedEpisode = useStudioStore((s) => s.setSelectedEpisode)
  const newBlankProject = useStudioStore((s) => s.newBlankProject)
  const authEmail = useStudioStore((s) => s.authEmail)
  const setAuthEmail = useStudioStore((s) => s.setAuthEmail)

  const { generateBible, generateEpisode, regenerateScene } = useStoryGeneration()
  const { generateCharacterBase } = useLeonardo()
  const { generate: backendGenerate } = useBackendGenerate()

  const [projectsMeta, setProjectsMeta] = useState<
    { id: string; title: string; status: string; updatedAt: string }[]
  >([])
  const [storyHistoryOpen, setStoryHistoryOpen] = useState(false)
  const [storyHistoryItems, setStoryHistoryItems] = useState<
    { id: string; title: string; status: string; updatedAt: string }[]
  >([])
  const [editMode, setEditMode] = useState(false)
  const [renderJobId, setRenderJobId] = useState<string | null>(null)
  const [renderStatus, setRenderStatus] = useState<any | null>(null)

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

  const refreshProjects = useCallback(async () => {
    const k = window.katha
    if (!k?.projectsList) return
    try {
      const list = await k.projectsList()
      setProjectsMeta(list)
    } catch {
      setProjectsMeta([])
    }
  }, [])

  const refreshStoryHistory = useCallback(async () => {
    const k = window.katha
    if (!k?.storyHistoryList) {
      setStoryHistoryItems([])
      return
    }
    try {
      const list = await k.storyHistoryList()
      setStoryHistoryItems(list)
    } catch {
      setStoryHistoryItems([])
    }
  }, [])

  useEffect(() => {
    void refreshProjects()
    void refreshStoryHistory()
  }, [refreshProjects, refreshStoryHistory])

  useEffect(() => {
    if (!renderJobId) return
    let alive = true
    const tick = async () => {
      try {
        const r = await fetch(`/api/render-status?id=${encodeURIComponent(renderJobId)}`)
        const j = await r.json()
        if (!alive) return
        setRenderStatus(j)
        if (j?.status === 'done' || j?.status === 'error') return
        setTimeout(tick, 1500)
      } catch {
        if (!alive) return
        setTimeout(tick, 2000)
      }
    }
    void tick()
    return () => {
      alive = false
    }
  }, [renderJobId])

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authEmailInput, setAuthEmailInput] = useState('')

  useEffect(() => {
    const k = window.katha
    if (!k?.authGetSession) return
    void (async () => {
      try {
        const s = await k.authGetSession()
        setAuthEmail(s.user?.email || null)
      } catch {
        setAuthEmail(null)
      }
    })()
  }, [setAuthEmail])

  const signIn = useCallback(async () => {
    const k = window.katha
    if (!k?.authSignInMagicLink) throw new Error('Auth not available')
    const email = authEmailInput.trim()
    if (!email.includes('@')) throw new Error('Enter a valid email')
    await k.authSignInMagicLink({ email, redirectTo: window.location.origin })
    setAuthEmail(email)
    setAuthModalOpen(false)
  }, [authEmailInput, setAuthEmail])

  const signOut = useCallback(async () => {
    const k = window.katha
    if (!k?.authSignOut) return
    await k.authSignOut()
    setAuthEmail(null)
  }, [setAuthEmail])

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

  const renderSourceUrls = useMemo(() => collectRenderImageUrls(project), [project])

  const sceneFrameAssets = useMemo(
    () => (project?.assets ?? []).filter((a) => a.kind === 'scene' && a.url),
    [project?.assets]
  )

  const startRender4k = useCallback(async () => {
    setError(null)
    try {
      const p = useStudioStore.getState().project
      const ep = p?.episodes?.[0]
      const imgs = collectRenderImageUrls(p)
      if (!imgs.length) {
        throw new Error(
          'No images yet. Set LEONARDO_API_KEY on Vercel for scene stills during generation, or use Leonardo: base portrait on each character in the sidebar.'
        )
      }
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle: p?.title,
          images: imgs,
          subtitles: ep?.scenes?.map((s, i) => ({
            startMs: i * 4000,
            endMs: (i + 1) * 4000,
            text: `${s.character}: ${s.text}`
          })),
          fps: 30,
          secondsPerImage: 4
        })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Render start failed')
      setRenderJobId(j.jobId)
      setRenderStatus(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [setError])

  const saveProject = async () => {
    const k = window.katha
    if (!k || !project) return
    setError(null)
    const payload = { ...project, updatedAt: new Date().toISOString() }
    try {
      await k.projectsSave(payload)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.includes('Not authenticated')) setError(msg)
    }
    await pushStoryToHistory(payload)
    await refreshProjects()
    await refreshStoryHistory()
  }

  const loadStoryFromHistory = async (id: string) => {
    const k = window.katha
    if (!k?.storyHistoryLoad) return
    try {
      const p = await k.storyHistoryLoad(id)
      setProject(p)
      setStoryHistoryOpen(false)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const deleteStoryFromHistory = async (id: string) => {
    const k = window.katha
    if (!k?.storyHistoryDelete) return
    try {
      await k.storyHistoryDelete(id)
      await refreshStoryHistory()
      if (project?.id === id) setProject(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
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
              void refreshStoryHistory()
              setStoryHistoryOpen(true)
            }}
          >
            {t('storyHistory')}
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
          {authEmail ? (
            <button type="button" className="btn btn-ghost" onClick={() => void signOut()} title={authEmail}>
              Sign out
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setAuthModalOpen(true)}>
              Sign in
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {lastError ? <div className="error-banner">{lastError}</div> : null}
        {busy ? <div className="busy-bar">{t('loading')} — {busy}</div> : null}
        {job ? (
          <div className="panel" style={{ marginBottom: 14 }}>
            <h3>Live monitor</h3>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)' }}>{job.stage || '—'}</span>
              <span className="badge">{job.progress}%</span>
            </div>
            {job.log?.length ? (
              <pre className="script-pre" style={{ maxHeight: 140 }}>
                {job.log.slice(-20).join('\n')}
              </pre>
            ) : null}
          </div>
        ) : null}

        {renderJobId ? (
          <div className="panel" style={{ marginBottom: 14 }}>
            <h3>Video render</h3>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)' }}>{renderStatus?.stage || 'queued'}</span>
              <span className="badge">{Number(renderStatus?.progress ?? 0)}%</span>
            </div>
            {renderStatus?.status === 'done' && renderStatus?.video_url ? (
              <div style={{ marginTop: 10 }}>
                <a className="btn" href={renderStatus.video_url} target="_blank" rel="noreferrer">
                  Download 4K MP4
                </a>
              </div>
            ) : null}
            {renderStatus?.status === 'error' ? (
              <div style={{ marginTop: 10, color: 'var(--danger)' }}>{renderStatus?.error || 'Render failed'}</div>
            ) : null}
          </div>
        ) : null}

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
              disabled={Boolean(busy) || !project?.bible || (project.episodes.length ? nextEpisodeNumber > totalEpisodes : false)}
              onClick={() => void generateEpisode(project.episodes.length ? nextEpisodeNumber : 1)}
            >
              {t('continueNext')} ({(project?.episodes?.length ? nextEpisodeNumber : 1)}/{totalEpisodes || '—'})
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
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!project?.bible}
              onClick={() => setEditMode((v) => !v)}
              title="Edit generated story"
            >
              {editMode ? 'Done editing' : 'Edit story'}
            </button>
          </div>
        </div>

        {project?.bible ? (
          <div className="panel" style={{ marginTop: 14 }}>
            {editMode ? (
              <input
                className="select"
                style={{ width: '100%', fontWeight: 800 }}
                value={project.title}
                onChange={(e) => patchProject((p) => ({ ...p, title: e.target.value }))}
                placeholder="Project title"
              />
            ) : (
              <h3>{project.title}</h3>
            )}
            {editMode ? (
              <textarea
                className="idea-input"
                style={{ marginTop: 10, minHeight: 70 }}
                value={project.bible.concept || ''}
                onChange={(e) =>
                  patchProject((p) =>
                    !p.bible ? p : { ...p, bible: { ...p.bible, concept: e.target.value } }
                  )
                }
                placeholder="Story setting / concept"
              />
            ) : null}
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
                  {editMode ? (
                    <textarea
                      className="idea-input"
                      style={{ display: 'block', marginTop: 6, minHeight: 56 }}
                      value={s.text}
                      onChange={(e) =>
                        patchProject((p) => {
                          const ep = p.episodes.find((x) => x.number === activeEpisode.number)
                          if (!ep) return p
                          const episodes = p.episodes.map((x) => {
                            if (x.number !== activeEpisode.number) return x
                            return {
                              ...x,
                              scenes: x.scenes.map((sc) =>
                                sc.index === s.index ? { ...sc, text: e.target.value } : sc
                              )
                            }
                          })
                          return { ...p, episodes, updatedAt: new Date().toISOString() }
                        })
                      }
                    />
                  ) : (
                    <span className={s.lineType === 'Thought' ? 'thought' : ''}>
                      {s.lineType === 'Thought' ? '(thought)' : ':'} {s.text}{' '}
                      {s.emoji ? <span aria-hidden>{s.emoji}</span> : null}
                    </span>
                  )}
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

        {project?.episodes?.length ? (
          <div className="panel" style={{ marginTop: 14 }}>
            <h3>Video (4K)</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 10px' }}>
              Builds a slideshow MP4 on your worker from scene stills (Leonardo during story generation)
              or, if you have none, from character portraits you generate in the sidebar.
            </p>
            <button
              type="button"
              className="btn"
              disabled={Boolean(busy) || !renderSourceUrls.length}
              onClick={() => void startRender4k()}
            >
              Generate Video (4K)
            </button>
            {!renderSourceUrls.length ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 8 }}>
                No images on this project yet. Add <code>LEONARDO_API_KEY</code> on Vercel and generate the
                story again for scene frames, or use Leonardo: base portrait per character.
              </p>
            ) : null}
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
                    {editMode ? (
                      <>
                        <input
                          className="select"
                          style={{ width: '100%', fontWeight: 700 }}
                          value={c.name}
                          onChange={(e) =>
                            patchProject((p) => {
                              if (!p.bible) return p
                              return {
                                ...p,
                                bible: {
                                  ...p.bible,
                                  characters: p.bible.characters.map((x) =>
                                    x.id === c.id ? { ...x, name: e.target.value } : x
                                  )
                                }
                              }
                            })
                          }
                        />
                        <textarea
                          className="idea-input"
                          style={{ marginTop: 6, minHeight: 52 }}
                          value={c.personality}
                          onChange={(e) =>
                            patchProject((p) => {
                              if (!p.bible) return p
                              return {
                                ...p,
                                bible: {
                                  ...p.bible,
                                  characters: p.bible.characters.map((x) =>
                                    x.id === c.id ? { ...x, personality: e.target.value } : x
                                  )
                                }
                              }
                            })
                          }
                        />
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 700 }}>{c.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{c.personality}</div>
                      </>
                    )}
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
              <h3>Scene frames</h3>
              {sceneFrameAssets.length ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 8
                  }}
                >
                  {sceneFrameAssets.map((a) => (
                    <img
                      key={a.id}
                      src={a.url}
                      alt={a.key}
                      style={{ width: '100%', height: 'auto', borderRadius: 8, objectFit: 'cover' }}
                    />
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
                  Scene stills appear here when the server generates Leonardo images for each script beat.
                </p>
              )}
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

      {storyHistoryOpen ? (
        <StoryHistoryModal
          items={storyHistoryItems}
          onClose={() => setStoryHistoryOpen(false)}
          onOpen={(id) => void loadStoryFromHistory(id)}
          onDelete={(id) => void deleteStoryFromHistory(id)}
        />
      ) : null}

      {authModalOpen ? (
        <div className="modal-backdrop" onClick={() => setAuthModalOpen(false)} role="presentation">
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Sign in</h2>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>We’ll send a secure magic link to your email.</p>
            <div className="row" style={{ marginTop: 12 }}>
              <input
                className="select"
                style={{ flex: 1 }}
                value={authEmailInput}
                onChange={(e) => setAuthEmailInput(e.target.value)}
                placeholder="you@example.com"
              />
              <button type="button" className="btn" onClick={() => void signIn()} disabled={Boolean(busy)}>
                Send link
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setAuthModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
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

function StoryHistoryModal({
  items,
  onClose,
  onOpen,
  onDelete
}: {
  items: { id: string; title: string; status: string; updatedAt: string }[]
  onClose: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t('storyHistory')}</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 6 }}>{t('storyHistoryHint')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {items.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>{t('storyHistoryEmpty')}</p>
          ) : (
            items.map((p) => (
              <div
                key={p.id}
                className="row"
                style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {p.status} · {p.updatedAt ? p.updatedAt.slice(0, 19).replace('T', ' ') : ''}
                  </div>
                </div>
                <div className="row" style={{ flexShrink: 0 }}>
                  <button type="button" className="btn btn-small" onClick={() => onOpen(p.id)}>
                    {t('storyHistoryOpen')}
                  </button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => onDelete(p.id)}>
                    {t('storyHistoryDelete')}
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
