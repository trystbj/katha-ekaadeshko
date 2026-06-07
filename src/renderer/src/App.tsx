import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useUiText } from './i18n/useAppI18n'
import { Glyphs } from './i18n/uiGlyphs'
import { STORY_IDEA_MAX_CHARS } from './constants/storyIdeaLimits'
import { useSyncUiLanguageToI18n } from './i18n/useSyncUiLanguageToI18n'
import { getCachedStylePreviewUrl } from './utils/stylePreviewImageCache'
import { migrateVisualStyleId } from './utils/styleIdMigration'
import {
  STYLE_PRESETS,
  defaultProject,
  newProjectId,
  type ProjectState,
  type VisualStyleId
} from './types/story'
import { useStudioStore } from './store/useStudioStore'
import { useStoryGeneration } from './hooks/useStoryGeneration'
import { useLeonardo } from './hooks/useLeonardo'
import { useBackendGenerate } from './hooks/useBackendGenerate'
import { useStorySpeechDictation } from './hooks/useStorySpeechDictation'
import { NARRATOR_UI_PRESETS, normalizeNarratorId } from './constants/narrators'
import { getGenerateReadiness, i18nKeyForMissing } from './utils/generateReadiness'
import { StudioAmbientBackdrop } from './components/StudioAmbientBackdrop'
import { PreviewStage } from './components/PreviewStage'
import { StoryboardPreviewWorkspace } from './components/StoryboardPreviewWorkspace'
import { ScriptReviewWorkspace } from './components/ScriptReviewWorkspace'
import { showScriptReviewWorkspace, withScriptReviewReopened } from './utils/productionWorkflow'
import { PreviewWorkspaceBackButton } from './components/PreviewWorkspaceBackButton'
import { StudioScriptWorkspaceTabs } from './components/StudioScriptWorkspaceTabs'
import { CinematicCharacterPreview } from './components/CinematicCharacterPreview'
import { withAutoCharacterConsistency } from './utils/characterConsistencyAuto'
import { buildVisualPipelinePayload } from './utils/buildVisualPipelinePayload'
import { episodeSceneImageCoverage } from './utils/storyboardWorkflow'
import {
  buildSceneImageRegenerationQueue,
  getScenesNeedingImageRegeneration
} from './utils/sceneImageStatus'
import type { SmartRegenAction } from './components/SmartSceneRegenMenu'
import { useVisualGeneration } from './hooks/useVisualGeneration'
import { useVideoGeneration } from './hooks/useVideoGeneration'
import { episodeNeedsMotionGeneration } from './utils/sceneAssetMap'
import { CinematicStoryboardMonitor } from './components/CinematicStoryboardMonitor'
import { MonitorEpisodeAccordion } from './components/MonitorEpisodeAccordion'
import { canShowStoryboardWorkspace } from './utils/storyboardWorkflow'
import { regenerateMissingSceneImages } from './utils/regenerateMissingSceneImages'
import { withVisualGenerationApproved } from './utils/sceneVisualApproval'
import { runFinalVideoGeneration } from './utils/finalVideoGeneration'

const PostExportVideoWorkspace = lazy(() =>
  import('./components/PostExportVideoWorkspace').then((m) => ({ default: m.PostExportVideoWorkspace }))
)
import { StoryWireframeQuad } from './components/StoryWireframeQuad'
import { CustomStylePanel } from './components/CustomStylePanel'
import { StudioGenerationBanner } from './components/StudioGenerationBanner'
import { StreamRevealDriver } from './components/StreamRevealDriver'
import {
  STYLE_WIREFRAME_LABEL_KEY,
  STYLE_WIREFRAME_ORDER,
  STYLE_WIREFRAME_TILE_SCRIM
} from './constants/styleWireframeOrder'
import { normalizeStudioSeasonId } from './constants/studioSeasonThemes'
import { LiveScriptPreview } from './components/LiveScriptPreview'
import { StoryLocalePicker } from './components/StoryLocalePicker'
import { MonitorCharacterCard } from './components/MonitorCharacterCard'
import { VoiceMicGlyph } from './components/VoiceMicGlyph'
import { StudioMonitorSearch } from './components/StudioMonitorSearch'
import { MonitorSettingsPanel } from './components/MonitorSettingsPanel'

const SavedProjectsWindow = lazy(() =>
  import('./components/SavedProjectsWindow').then((m) => ({ default: m.SavedProjectsWindow }))
)
const MonitorUserGuide = lazy(() =>
  import('./components/MonitorUserGuide').then((m) => ({ default: m.MonitorUserGuide }))
)
import { namesMatch } from './utils/characterNameMatch'
import { pushStoryToHistory } from './utils/storyHistory'
import { STUDIO_BROADCAST_CHANNEL } from './constants/studioSync'
import { StudioMonitorLabelIcon } from './components/StudioMonitorLabelIcon'
import { StudioStyleLabelIcon } from './components/StudioStyleLabelIcon'
import { EpisodeSequentialBanner } from './components/EpisodeSequentialBanner'
import { SeriesCompleteRewardModal } from './components/SeriesCompleteRewardModal'
import { normalizeUiLanguageCode } from './i18n/resources'
import {
  allEpisodesWritten as projectEveryEpisodeDrafted,
  canJumpToFinale,
  previousEpisodeVideoExportDone,
  resolveOngoingEpisodeNumber,
  seriesFullyExported
} from './utils/episodeSeriesFlow'
import './styles/episode-series-flow.css'
import { BrandTitleStardust } from './components/BrandTitleStardust'
import { repairProjectOnLoad } from './utils/projectRecovery'
import { collectRenderImageUrls } from './utils/collectRenderImageUrls'
import {
  dedupeScenePreviewUrls,
  removeSceneAssetsForIndices,
  sceneUrlForIndex
} from './utils/sceneAssetMap'
import { displayUrlsForEpisodeScenes } from './utils/unifiedSceneState'
import { resumeEpisodeVideoRenderIfNeeded } from './utils/episodeVideoRender'
import { CreatorStudioPanel } from './components/CreatorStudioPanel'
import {
  downloadMarkdownFile,
  projectToMarkdown,
  safeFilenameFromTitle
} from './utils/exportStoryMarkdown'
import {
  charactersNeedingPortraits,
  hasAutoPortraitRun,
  markAutoPortraitRun
} from './utils/autoGenerateCharacterPortraits'
import { openCharacterPreview } from './utils/openCharacterPreview'

function splitStudioSubtitleGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      return Array.from(
        new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
        (seg) => seg.segment
      )
    } catch {
      /* ignore */
    }
  }
  return Array.from(text)
}

function isOngoingHistoryStatus(s: string) {
  return s === 'in_progress' || s === 'new'
}

export default function App() {
  const uiText = useUiText()
  const appSubtitle = uiText('appSubtitle')
  const appSubtitleChars = useMemo(() => splitStudioSubtitleGraphemes(appSubtitle), [appSubtitle])
  const appSubtitleDropCycleSec = Math.min(6.4, Math.max(3.5, 2.55 + appSubtitleChars.length * 0.17))
  const theme = useStudioStore((s) => s.theme)
  const uiLanguage = useStudioStore((s) => s.uiLanguage)
  const storyLanguage = useStudioStore((s) => s.storyLanguage)
  const uiFontMode = useStudioStore((s) => s.uiFontMode)
  const idea = useStudioStore((s) => s.idea)
  const setIdea = useStudioStore((s) => s.setIdea)
  const backendTheme = useStudioStore((s) => s.backendTheme)
  const backendGenre = useStudioStore((s) => s.backendGenre)
  const backendLength = useStudioStore((s) => s.backendLength)
  const setBackendTheme = useStudioStore((s) => s.setBackendTheme)
  const setBackendGenre = useStudioStore((s) => s.setBackendGenre)
  const setBackendLength = useStudioStore((s) => s.setBackendLength)
  const styleId = useStudioStore((s) => s.styleId)
  const setStyleId = useStudioStore((s) => s.setStyleId)
  const setCustomStyleOverlayOpen = useStudioStore((s) => s.setCustomStyleOverlayOpen)
  const customStyleOverlayOpen = useStudioStore((s) => s.customStyleOverlayOpen)
  const customVisualPrompt = useStudioStore((s) => s.customVisualPrompt)
  const hydrateStudioFromBible = useStudioStore((s) => s.hydrateStudioFromBible)
  const narratorId = useStudioStore((s) => s.narratorId)
  const setNarratorId = useStudioStore((s) => s.setNarratorId)
  const project = useStudioStore((s) => s.project)
  const setProject = useStudioStore((s) => s.setProject)
  const patchProject = useStudioStore((s) => s.patchProject)
  const busy = useStudioStore((s) => s.busy)
  const setBusy = useStudioStore((s) => s.setBusy)
  const lastError = useStudioStore((s) => s.lastError)
  const setError = useStudioStore((s) => s.setError)
  const job = useStudioStore((s) => s.job)
  const streamReveal = useStudioStore((s) => s.streamReveal)
  const studioSeasonId = useStudioStore((s) => s.studioSeasonId)
  const settingsOpen = useStudioStore((s) => s.settingsOpen)
  const setSettingsOpen = useStudioStore((s) => s.setSettingsOpen)
  const selectedEpisode = useStudioStore((s) => s.selectedEpisode)
  const setSelectedEpisode = useStudioStore((s) => s.setSelectedEpisode)
  const setAuthEmail = useStudioStore((s) => s.setAuthEmail)

  const { generateEpisode, regenerateScene } = useStoryGeneration()
  const { generateCharacterBase } = useLeonardo()
  const { generate: backendGenerate } = useBackendGenerate()
  const { generateVisuals, ensureEpisodeSceneImages } = useVisualGeneration()
  const { generateSceneVideos } = useVideoGeneration()

  const [projectsMeta, setProjectsMeta] = useState<
    { id: string; title: string; status: string; updatedAt: string }[]
  >([])
  const [storyHistoryOpen, setStoryHistoryOpen] = useState(false)
  const [storyHistoryItems, setStoryHistoryItems] = useState<
    {
      id: string
      title: string
      status: string
      updatedAt: string
      episodeCount?: number
      totalEpisodes?: number | null
    }[]
  >([])
  const [editMode, setEditMode] = useState(false)
  const [apiProvidersAvailable, setApiProvidersAvailable] = useState<boolean | null>(null)
  const [stylePreviewUrls, setStylePreviewUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    // Preload cached previews so the style grid can show scene-based frames instantly.
    const next: Record<string, string> = {}
    for (const id of STYLE_WIREFRAME_ORDER) {
      const url = getCachedStylePreviewUrl(id, id === 'custom' ? customVisualPrompt : undefined)
      if (url) next[id] = url
    }
    setStylePreviewUrls((cur) => ({ ...cur, ...next }))
  }, [customVisualPrompt])

  // Leonardo style previews disabled on load — static `/style-previews/*` assets keep the UI responsive.

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    useStudioStore.getState().initializeWorkspaceSlots()
    const st = useStudioStore.getState()
    const migrated = migrateVisualStyleId(st.styleId)
    if (migrated && migrated !== st.styleId) st.setStyleId(migrated)
    const season = st.studioSeasonId
    const nextSeason = normalizeStudioSeasonId(season)
    if (nextSeason !== season) st.setStudioSeasonId(nextSeason)
  }, [])

  useEffect(() => {
    const st = useStudioStore.getState()
    const next = normalizeUiLanguageCode(st.uiLanguage)
    if (next !== st.uiLanguage) st.setUiLanguage(next)
  }, [])

  useSyncUiLanguageToI18n()

  useEffect(() => {
    const fm = project?.fontMode ?? uiFontMode
    document.body.classList.remove('font-clean', 'font-story', 'font-comic')
    document.body.classList.add(`font-${fm}`)
  }, [project?.fontMode, uiFontMode])

  useEffect(() => {
    const bid = project?.bible?.narratorId
    if (bid == null || String(bid).trim() === '') return
    setNarratorId(normalizeNarratorId(bid))
  }, [project?.id, project?.bible?.narratorId, setNarratorId])

  useEffect(() => {
    // Restore per-project UI language (if stored) without changing layout.
    const lng = project?.uiLanguage
    if (!lng) return
    if (lng === useStudioStore.getState().uiLanguage) return
    useStudioStore.getState().setUiLanguage(lng)
  }, [project?.id, project?.uiLanguage])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => {
      if (useStudioStore.getState().theme === 'system') {
        const next = mq.matches ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', next)
        document.documentElement.style.colorScheme = next
      }
    }
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const k = window.katha
      if (!k?.settingsGetApiKeys) {
        if (!cancelled) setApiProvidersAvailable(false)
        return
      }
      try {
        const m = await k.settingsGetApiKeys()
        const ok = Boolean(
          m.hasOpenAI || m.hasGemini || m.hasDeepSeek || m.hasLeonardo
        )
        if (!cancelled) setApiProvidersAvailable(ok)
      } catch {
        if (!cancelled) setApiProvidersAvailable(false)
      }
    }
    void tick()
    const iv = window.setInterval(tick, 25000)
    return () => {
      cancelled = true
      window.clearInterval(iv)
    }
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

  /** Debounced local auto-save: keeps story history in sync on every project change (episodes, edits). */
  const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!project?.id || !project.bible) return
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current)
    localSaveTimerRef.current = setTimeout(() => {
      localSaveTimerRef.current = null
      void pushStoryToHistory(useStudioStore.getState().project)
    }, 1200)
    return () => {
      if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current)
    }
  }, [project])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const bc = new BroadcastChannel(STUDIO_BROADCAST_CHANNEL)
    bc.onmessage = (ev: MessageEvent) => {
      const d = ev.data as { type?: string; id?: string }
      const storyId = d?.id
      if (d?.type !== 'open-story-history' || !storyId) return
      void (async () => {
        const k = window.katha
        if (!k?.storyHistoryLoad) return
        try {
          const p = await k.storyHistoryLoad(storyId)
          setProject(p)
          hydrateStudioFromBible(p.bible ?? undefined)
          setError(null)
          setStoryHistoryOpen(false)
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e))
        }
      })()
    }
    return () => bc.close()
  }, [setProject, hydrateStudioFromBible, setError, setStoryHistoryOpen])

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authEmailInput, setAuthEmailInput] = useState('')
  const [celebratePipelineComplete, setCelebratePipelineComplete] = useState(false)
  const prevBusyCelebrateRef = useRef<string | null>(null)
  const [episodeExportFlash, setEpisodeExportFlash] = useState<number | null>(null)
  const exportSigRef = useRef('')
  const [seriesRewardOpen, setSeriesRewardOpen] = useState(false)
  const seriesRewardShownSessionRef = useRef<string | null>(null)

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

  const selectNarrator = useCallback(
    (id: string) => {
      const canon = normalizeNarratorId(id)
      if (!NARRATOR_UI_PRESETS.some((n) => n.id === canon)) return
      setNarratorId(canon)
      patchProject((p) => {
        if (!p.bible) return { ...p, updatedAt: new Date().toISOString() }
        return {
          ...p,
          bible: { ...p.bible, narratorId: canon },
          updatedAt: new Date().toISOString()
        }
      })
    },
    [setNarratorId, patchProject]
  )

  const nextEpisodeNumber = useMemo(() => {
    if (!project?.bible) return 1
    const max = project.episodes.reduce((m, e) => Math.max(m, e.number), 0)
    return max + 1
  }, [project])

  const totalEpisodes = project?.bible?.totalEpisodes ?? 0

  const ongoingEpisodeNumber = useMemo(
    () => resolveOngoingEpisodeNumber(project),
    [project]
  )

  const storyMetaLocked = Boolean(project?.bible)
  const allEpisodesWritten = projectEveryEpisodeDrafted(project)
  const wantsContinueEpisode = Boolean(
    project?.bible &&
      !busy &&
      totalEpisodes > 0 &&
      !allEpisodesWritten &&
      (project!.episodes.length ? nextEpisodeNumber <= totalEpisodes : true)
  )
  const exportGateBlocksContinue = Boolean(
    wantsContinueEpisode &&
      nextEpisodeNumber > 1 &&
      !previousEpisodeVideoExportDone(project, nextEpisodeNumber)
  )

  const activeEpisode = useMemo(() => {
    if (!project || selectedEpisode == null) return null
    return project.episodes.find((e) => e.number === selectedEpisode) ?? null
  }, [project, selectedEpisode])

  /** Scene | Script | Voice: pending scenes during live reveal, then active episode. */
  const scriptPanelScenes = useMemo(() => {
    const pending = streamReveal?.pendingProject
    if (pending?.episodes?.length) {
      const epn = ongoingEpisodeNumber
      const ep = pending.episodes.find((e) => e.number === epn) ?? pending.episodes[0]
      const pendingScenes = ep?.scenes ?? []
      if (pendingScenes.length) return pendingScenes
    }
    return activeEpisode?.scenes ?? []
  }, [activeEpisode?.scenes, streamReveal?.pendingProject, ongoingEpisodeNumber])

  const renderSourceUrls = useMemo(() => {
    if (activeEpisode?.scenes?.length) {
      return displayUrlsForEpisodeScenes(project, activeEpisode)
    }
    return collectRenderImageUrls(project)
  }, [project, activeEpisode, project?.updatedAt, project?.pipelineValidationReport])

  const pipelineThumbUrls = useMemo(
    () => dedupeScenePreviewUrls(renderSourceUrls),
    [renderSourceUrls]
  )

  const [embeddedPreviewIndex, setEmbeddedPreviewIndex] = useState(0)
  const [embeddedHeroOverride, setEmbeddedHeroOverride] = useState<string | null>(null)
  const [characterPreviewId, setCharacterPreviewId] = useState<string | null>(null)

  const characterPreviewChar = useMemo(
    () => project?.bible?.characters.find((c) => c.id === characterPreviewId) ?? null,
    [characterPreviewId, project?.bible?.characters]
  )

  const exitCharacterPreview = useCallback(() => {
    setCharacterPreviewId(null)
    setEmbeddedHeroOverride(null)
  }, [])

  const selectCharacterPreview = useCallback((c: import('./types/story').StoryCharacter) => {
    openCharacterPreview(c, setCharacterPreviewId, setEmbeddedHeroOverride)
  }, [])

  const pipelineSceneTotalEstimate = useMemo(() => {
    const fromEpisode = activeEpisode?.scenes?.length ?? 0
    if (fromEpisode > 0) return fromEpisode
    return renderSourceUrls.length
  }, [activeEpisode?.scenes?.length, renderSourceUrls.length])

  useEffect(() => {
    if (busy === 'generating' || busy === 'rendering') setCelebratePipelineComplete(false)
  }, [busy])

  /** Strip legacy seed counter / limit hints (stale dist bundles or extensions). */
  useEffect(() => {
    const wrap = storyIdeaWrapRef.current
    const panel = wrap?.closest('.studio-mock-panel')
    const purge = () => {
      const ta = ideaRef.current
      if (ta) {
        ta.removeAttribute('placeholder')
        ta.placeholder = ''
        ta.removeAttribute('aria-describedby')
      }
      panel
        ?.querySelectorAll(
          '#studio-story-seed-count, #studio-story-seed-soft-warn, .studio-mock-char-count, .studio-mock-char-soft-warn'
        )
        .forEach((el) => el.remove())
    }
    purge()
    if (!panel) return
    const obs = new MutationObserver(purge)
    obs.observe(panel, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [idea, project?.bible])

  const [dismissedExportPreview, setDismissedExportPreview] = useState(false)

  useEffect(() => {
    setDismissedExportPreview(false)
  }, [project?.lastRenderVideoUrl])

  const showPostExportPreview = Boolean(project?.lastRenderVideoUrl && !dismissedExportPreview)

  const showScriptReview = useMemo(
    () =>
      Boolean(
        project?.bible &&
          !showPostExportPreview &&
          !streamReveal &&
          showScriptReviewWorkspace(project)
      ),
    [project, streamReveal, showPostExportPreview]
  )

  const showStoryboardPreview = useMemo(
    () =>
      Boolean(
        project?.bible &&
          !showPostExportPreview &&
          !streamReveal &&
          !showScriptReview &&
          (canShowStoryboardWorkspace(project, activeEpisode?.number) || project.storyboardReady)
      ),
    [project, streamReveal, showScriptReview, showPostExportPreview, activeEpisode?.number]
  )

  const activeWorkspaceSlotIndex = useStudioStore((s) => s.activeWorkspaceSlotIndex)
  const clearWorkspaceSlot = useStudioStore((s) => s.clearWorkspaceSlot)

  useEffect(() => {
    const concept = project?.bible?.concept?.trim()
    if (!concept) return
    if (!useStudioStore.getState().idea.trim()) {
      setIdea(concept)
    }
  }, [project?.id, project?.bible?.concept, setIdea])

  const onReopenScriptReview = useCallback(() => {
    patchProject((p) => withScriptReviewReopened(p))
  }, [patchProject])

  const showPreviewBack = Boolean(
    project?.bible &&
      (showPostExportPreview || showStoryboardPreview || showScriptReview || characterPreviewId)
  )

  const onPreviewWorkspaceBack = useCallback(() => {
    if (characterPreviewId) {
      exitCharacterPreview()
      return
    }
    if (showPostExportPreview) {
      setDismissedExportPreview(true)
      return
    }
    if (showStoryboardPreview) {
      onReopenScriptReview()
      return
    }
    if (showScriptReview) {
      document.getElementById('studio-story-seed')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      document.getElementById('studio-story-seed')?.focus()
    }
  }, [
    characterPreviewId,
    exitCharacterPreview,
    showPostExportPreview,
    showStoryboardPreview,
    showScriptReview,
    onReopenScriptReview
  ])

  const onMonitorRegenerateScene = useCallback(
    (sceneIndex: number) => {
      const epn = selectedEpisode ?? activeEpisode?.number ?? 1
      useStudioStore.getState().patchProject((cur) =>
        cur.bible ? removeSceneAssetsForIndices(cur, [sceneIndex]) : cur
      )
      void generateVisuals({ episodeNumber: epn, sceneIndices: [sceneIndex], forceRegenerate: true })
    },
    [activeEpisode?.number, generateVisuals, selectedEpisode]
  )

  const onMonitorGenerateSceneImage = useCallback(
    (sceneIndex: number) => {
      const epn = selectedEpisode ?? activeEpisode?.number ?? resolveOngoingEpisodeNumber(project)
      void generateVisuals({ episodeNumber: epn, sceneIndices: [sceneIndex] })
    },
    [activeEpisode?.number, generateVisuals, project, selectedEpisode]
  )

  const onMonitorReplaceSceneImage = useCallback(
    (sceneIndex: number) => {
      onMonitorRegenerateScene(sceneIndex)
    },
    [onMonitorRegenerateScene]
  )

  const onStartNewStory = useCallback(() => {
    if (!window.confirm(uiText('startNewStoryConfirm'))) return
    clearWorkspaceSlot(activeWorkspaceSlotIndex)
    setEditMode(false)
    setEmbeddedPreviewIndex(0)
    setEmbeddedHeroOverride(null)
    setCharacterPreviewId(null)
    console.info('[katha:production]', 'start_new_story', { slot: activeWorkspaceSlotIndex })
  }, [activeWorkspaceSlotIndex, clearWorkspaceSlot, uiText])

  const approveAndGenerateAllSceneImages = useCallback(() => {
    const p = useStudioStore.getState().project
    if (!p?.bible) return
    const epn = selectedEpisode ?? activeEpisode?.number ?? resolveOngoingEpisodeNumber(p)
    const ep = p.episodes.find((e) => e.number === epn) ?? p.episodes[0]
    if (!ep?.scenes?.length) {
      setError(uiText('studioSceneSectionEmpty'))
      return
    }
    const sceneIndices = getScenesNeedingImageRegeneration(p, epn)
    if (!sceneIndices.length) {
      setError(uiText('studioSceneImagesComplete'))
      return
    }
    if (!buildVisualPipelinePayload(p, epn)) {
      setError(uiText('visualGenMissingScript'))
      return
    }
    console.info('[katha:production]', 'generate_all_scene_images', {
      episodeNumber: epn,
      sceneIndices
    })
    setError(null)
    patchProject((cur) => withAutoCharacterConsistency(withVisualGenerationApproved(cur, epn)))
    void generateVisuals({ episodeNumber: epn, sceneIndices })
  }, [
    activeEpisode?.number,
    generateVisuals,
    patchProject,
    selectedEpisode,
    setError,
    uiText
  ])

  const retryFailedSceneImages = useCallback(
    (sceneIndices?: number[]) => {
      const p = useStudioStore.getState().project
      if (!p?.bible) return
      const epn = selectedEpisode ?? activeEpisode?.number ?? resolveOngoingEpisodeNumber(p)
      const need =
        sceneIndices?.length && sceneIndices.length > 0
          ? buildSceneImageRegenerationQueue(p, epn, { sceneIndices })
          : getScenesNeedingImageRegeneration(p, epn)
      if (!need.length) return
      setError(null)
      console.info('[katha:production]', 'retry_failed_scenes', { episodeNumber: epn, sceneIndices: need })
      void generateVisuals({ episodeNumber: epn, sceneIndices: need })
    },
    [activeEpisode?.number, generateVisuals, selectedEpisode, setError]
  )

  const onRegenerateMissingSceneImages = useCallback(async () => {
    const p = useStudioStore.getState().project
    if (!p?.bible) return
    const epn = selectedEpisode ?? resolveOngoingEpisodeNumber(p)
    setBusy('leonardo')
    setError(null)
    try {
      const next = await regenerateMissingSceneImages(p, epn, {
        onProjectPatch: (partial) => patchProject(() => partial)
      })
      patchProject(() => next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [patchProject, selectedEpisode, setBusy, setError])

  const onExportProject = useCallback(() => {
    const p = useStudioStore.getState().project
    if (!p?.bible) return
    const body = projectToMarkdown(p)
    downloadMarkdownFile(`${safeFilenameFromTitle(p.title)}.md`, body)
  }, [])

  const onAdvancedEditor = useCallback(() => {
    setCreatorStudioOpen(true)
    setCharactersMonitorOpen(false)
    requestAnimationFrame(() => {
      document
        .getElementById('studio-wireframe-creator')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [])

  const prevBusyAutoCharRef = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevBusyAutoCharRef.current
    prevBusyAutoCharRef.current = busy
    if (busy || prev !== 'generating') return
    const p = useStudioStore.getState().project
    if (!p?.bible || !p.id) return
    void (async () => {
      const { auditCharacterPortraits } = await import('./utils/characterPortraitRecovery')
      const audit = await auditCharacterPortraits(p)
      const need = [
        ...charactersNeedingPortraits(p),
        ...audit.needsRegen
          .map((n) => p.bible?.characters.find((c) => c.id === n.id))
          .filter(Boolean)
      ].filter(
        (ch, i, arr) => ch && arr.findIndex((x) => x?.id === ch.id) === i
      ) as NonNullable<ReturnType<typeof charactersNeedingPortraits>>[number][]
      if (!need.length || hasAutoPortraitRun(p.id)) return
      markAutoPortraitRun(p.id)
      console.info('[katha:character]', 'auto_portrait_batch_start', {
        count: need.length,
        reasons: audit.needsRegen.map((r) => r.reason)
      })
      for (const ch of need) {
        if (useStudioStore.getState().busy) break
        await generateCharacterBase(ch.id)
      }
    })()
  }, [busy, generateCharacterBase, project?.id, project?.bible?.characters?.length])

  const onGenerateFinalVideo = useCallback(() => {
    const p = useStudioStore.getState().project
    if (!p?.bible) return
    const epn = selectedEpisode ?? resolveOngoingEpisodeNumber(p)
    const ep = p.episodes.find((e) => e.number === epn) ?? p.episodes[0]
    console.info('[katha:render]', 'user_triggered_final_render', { projectId: p.id, episodeNumber: epn })
    void runFinalVideoGeneration({
      project: p,
      episodeNumber: epn,
      ensureSceneImages: ensureEpisodeSceneImages,
      generateVisuals: (o) => generateVisuals(o),
      onBeforeMotion: async (episodeNumber) => {
        if (ep?.scenes?.length && episodeNeedsMotionGeneration(p, ep.scenes)) {
          console.info('[katha:video]', 'pre_render_motion_pass', { projectId: p.id })
          await generateSceneVideos({ episodeNumber })
        }
      }
    })
  }, [ensureEpisodeSceneImages, generateSceneVideos, generateVisuals, selectedEpisode])

  useEffect(() => {
    const prev = prevBusyCelebrateRef.current
    prevBusyCelebrateRef.current = busy
    if (busy || lastError) return
    if (prev === 'generating' && showScriptReview) {
      console.info('[katha:production]', 'celebrate_script_review_ready')
      setCelebratePipelineComplete(true)
      return
    }
    if (prev === 'generating' && showStoryboardPreview) {
      console.info('[katha:storyboard]', 'celebrate_storyboard_ready')
      setCelebratePipelineComplete(true)
      return
    }
    if (prev === 'rendering' && project?.lastRenderVideoUrl) {
      console.info('[katha:render] celebrate_on_render_complete', {
        videoUrl: project.lastRenderVideoUrl
      })
      setCelebratePipelineComplete(true)
    }
  }, [busy, lastError, project?.lastRenderVideoUrl, showStoryboardPreview, showScriptReview])

  useEffect(() => {
    if (!celebratePipelineComplete) return
    const ms = project?.lastRenderVideoUrl ? 4800 : 3600
    const id = window.setTimeout(() => setCelebratePipelineComplete(false), ms)
    return () => window.clearTimeout(id)
  }, [celebratePipelineComplete, project?.lastRenderVideoUrl])

  useEffect(() => {
    resumeEpisodeVideoRenderIfNeeded(project)
  }, [project?.id, project?.renderJobId, project?.lastRenderVideoUrl])

  const abortPipelineGenerate = useCallback(() => {
    useStudioStore.getState().abortGenerationInFlight()
  }, [])

  const exportCompleteSig = useMemo(
    () =>
      (project?.episodes ?? [])
        .filter((e) => e.videoExportComplete)
        .map((e) => e.number)
        .sort((a, b) => a - b)
        .join(','),
    [project?.episodes]
  )

  useEffect(() => {
    seriesRewardShownSessionRef.current = null
  }, [project?.id])

  useEffect(() => {
    const prev = exportSigRef.current
    if (prev === '') {
      exportSigRef.current = exportCompleteSig
      return
    }
    if (prev === exportCompleteSig) return
    exportSigRef.current = exportCompleteSig
    const prevNums = prev ? prev.split(',').map(Number).filter(Boolean) : []
    const currNums = exportCompleteSig ? exportCompleteSig.split(',').map(Number).filter(Boolean) : []
    const newly = currNums.filter((n) => !prevNums.includes(n))
    const hit = newly[newly.length - 1]
    if (hit != null && hit > 0 && (project?.bible?.totalEpisodes ?? 0) > 1) {
      setEpisodeExportFlash(hit)
      const id = window.setTimeout(() => setEpisodeExportFlash(null), 9000)
      return () => window.clearTimeout(id)
    }
  }, [exportCompleteSig, project?.bible?.totalEpisodes])

  /** Story Monitor tracks one ongoing episode; auto-advance when export completes. */
  useEffect(() => {
    if (!project?.bible) return
    setSelectedEpisode(ongoingEpisodeNumber)
  }, [project?.id, ongoingEpisodeNumber, exportCompleteSig, setSelectedEpisode])

  useEffect(() => {
    if (!project?.id || !seriesFullyExported(project)) return
    try {
      if (sessionStorage.getItem(`katha:series-reward:${project.id}`) === '1') return
    } catch {
      /* ignore */
    }
    const key = `${project.id}:exported`
    if (seriesRewardShownSessionRef.current === key) return
    seriesRewardShownSessionRef.current = key
    setSeriesRewardOpen(true)
  }, [project])

  const skipExportGate = useCallback(() => {
    if (!project?.bible || nextEpisodeNumber <= 1) return
    const prevN = nextEpisodeNumber - 1
    patchProject((p) => ({
      ...p,
      episodes: p.episodes.map((e) => (e.number === prevN ? { ...e, videoExportComplete: true } : e)),
      updatedAt: new Date().toISOString()
    }))
  }, [project?.bible, nextEpisodeNumber, patchProject])

  const spinOffSeries = useCallback(() => {
    const p = useStudioStore.getState().project
    if (!p?.bible) return
    const raw = JSON.parse(JSON.stringify(p)) as ProjectState
    const next = defaultProject({
      ...raw,
      id: newProjectId(),
      title: `${p.title || 'Story'} · spin-off`.slice(0, 120),
      episodes: [],
      memorySummary: `${p.memorySummary}\n- Spin-off thread: preserve bible canon; pursue a fresh subplot.`.slice(
        0,
        4000
      ),
      lastRenderVideoUrl: undefined,
      videoStudio: undefined,
      status: 'in_progress',
      updatedAt: new Date().toISOString()
    })
    setProject(next)
    hydrateStudioFromBible(next.bible ?? undefined)
    setSelectedEpisode(null)
    void pushStoryToHistory(next)
  }, [setProject, hydrateStudioFromBible, setSelectedEpisode])

  const endSeriesHere = useCallback(() => {
    patchProject((p) => ({
      ...p,
      status: 'completed',
      updatedAt: new Date().toISOString()
    }))
  }, [patchProject])

  const generateFinaleNow = useCallback(() => {
    const p = useStudioStore.getState().project
    if (!p?.bible || !canJumpToFinale(p)) return
    void generateEpisode(p.bible.totalEpisodes)
  }, [generateEpisode])

  /** Sidebar + script monitor: which scene speaker row is “in focus”. */
  const [focusedSceneSpeaker, setFocusedSceneSpeaker] = useState<string | null>(null)
  const [monitorSearchOpen, setMonitorSearchOpen] = useState(false)
  const [monitorSearchQuery, setMonitorSearchQuery] = useState('')
  const [creatorStudioOpen, setCreatorStudioOpen] = useState(false)
  const [charactersMonitorOpen, setCharactersMonitorOpen] = useState(false)
  const [savedLibraryOpen, setSavedLibraryOpen] = useState(false)
  const [helpCenterOpen, setHelpCenterOpen] = useState(false)
  /** Script column body: preview + optional story-defaults overlay (overlay does not replace preview in layout). */
  const scriptGenDefaultsPortalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!settingsOpen) setHelpCenterOpen(false)
  }, [settingsOpen])

  useEffect(() => {
    setFocusedSceneSpeaker(null)
    setEmbeddedPreviewIndex(0)
    setEmbeddedHeroOverride(null)
  }, [selectedEpisode, activeEpisode?.number, project?.id])

  useEffect(() => {
    if (activeEpisode?.scenes?.length) setCharactersMonitorOpen(false)
  }, [activeEpisode?.scenes?.length, project?.id])

  const onMonitorSceneSelect = useCallback(
    (rowIndex: number) => {
      setCharacterPreviewId(null)
      setEmbeddedHeroOverride(null)
      setEmbeddedPreviewIndex(rowIndex)
      const sc = activeEpisode?.scenes[rowIndex]
      if (sc) setFocusedSceneSpeaker(sc.character.trim())
    },
    [activeEpisode?.scenes]
  )

  const onMonitorSmartRegen = useCallback(
    (sceneIndex: number, action: SmartRegenAction) => {
      if (!project) return
      const epn = selectedEpisode ?? activeEpisode?.number ?? resolveOngoingEpisodeNumber(project)
      switch (action) {
        case 'image':
          void generateVisuals({ episodeNumber: epn, sceneIndices: [sceneIndex] })
          break
        case 'motion':
          void generateSceneVideos({ episodeNumber: epn, sceneIndices: [sceneIndex] })
          break
        case 'script':
        case 'dialogue':
        case 'narration':
        case 'scene':
        default:
          void regenerateScene(epn, sceneIndex)
      }
    },
    [
      activeEpisode?.number,
      generateSceneVideos,
      generateVisuals,
      project,
      regenerateScene,
      selectedEpisode
    ]
  )

  useEffect(() => {
    const maxIx = (activeEpisode?.scenes?.length ?? renderSourceUrls.length) - 1
    if (maxIx >= 0 && embeddedPreviewIndex > maxIx) {
      setEmbeddedPreviewIndex(0)
    }
  }, [activeEpisode?.scenes?.length, renderSourceUrls.length, embeddedPreviewIndex])

  const loadStoryFromHistory = async (id: string) => {
    const k = window.katha
    if (!k?.storyHistoryLoad) return
    try {
      const p = await k.storyHistoryLoad(id)
      setProject(p)
      hydrateStudioFromBible(p.bible ?? undefined)
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
    const p = repairProjectOnLoad(await k.projectsLoad(id))
    if (!p) {
      setError('Project could not be loaded — data may be incomplete.')
      return
    }
    setProject(p)
    hydrateStudioFromBible(p.bible ?? undefined)
  }

  const ideaRef = useRef<HTMLTextAreaElement | null>(null)
  const storyIdeaWrapRef = useRef<HTMLDivElement | null>(null)
  const studioMonitorBodyRef = useRef<HTMLDivElement | null>(null)
  const monitorColumnRef = useRef<HTMLElement | null>(null)
  const monitorSearchPanelRef = useRef<HTMLDivElement | null>(null)
  const studioMonitorSearchToggleRef = useRef<HTMLButtonElement | null>(null)

  const { voiceMicPhase, voiceMicTitle, toggleVoiceToIdea, canUseSpeech } = useStorySpeechDictation({
    idea,
    setIdea,
    ideaRef,
    storyLanguage,
    uiLanguage,
    busy: Boolean(busy),
    setError,
    uiText
  })

  useEffect(() => {
    if (!savedLibraryOpen && !settingsOpen && !storyHistoryOpen && !monitorSearchOpen) return
    const onOutside = (e: PointerEvent) => {
      const col = monitorColumnRef.current
      if (!col || col.contains(e.target as Node)) return
      setSavedLibraryOpen(false)
      setSettingsOpen(false)
      setStoryHistoryOpen(false)
      setMonitorSearchOpen(false)
    }
    document.addEventListener('pointerdown', onOutside, true)
    return () => document.removeEventListener('pointerdown', onOutside, true)
  }, [savedLibraryOpen, settingsOpen, storyHistoryOpen, monitorSearchOpen, setSettingsOpen])

  /** Close monitor search on outside tap — anywhere except the search panel or 🔎 toggle (toggle handles open/close). */
  useEffect(() => {
    if (!monitorSearchOpen) return
    const onDoc = (e: PointerEvent) => {
      const node = e.target as Node
      if (monitorSearchPanelRef.current?.contains(node)) return
      if (studioMonitorSearchToggleRef.current?.contains(node)) return
      setMonitorSearchOpen(false)
      setMonitorSearchQuery('')
    }
    document.addEventListener('pointerdown', onDoc, true)
    return () => document.removeEventListener('pointerdown', onDoc, true)
  }, [monitorSearchOpen])

  const generateReadiness = useMemo(
    () =>
      getGenerateReadiness({
        hasBible: Boolean(project?.bible),
        styleId: styleId || '',
        narratorId: narratorId || '',
        backendTheme,
        backendGenre,
        backendLength,
        uiLanguage,
        storyLanguage,
        idea,
        customVisualPrompt
      }),
    [
      project?.bible,
      styleId,
      narratorId,
      backendTheme,
      backendGenre,
      backendLength,
      uiLanguage,
      storyLanguage,
      idea,
      customVisualPrompt
    ]
  )
  const canRunStreamGenerate = !busy && !project?.bible && generateReadiness.canGenerate

  const generateButtonTitle = useMemo(() => {
    if (canRunStreamGenerate || busy) return undefined
    if (!project?.bible && generateReadiness.missing[0]) {
      return uiText('missingFieldDetail', { field: uiText(i18nKeyForMissing(generateReadiness.missing[0])) })
    }
    return uiText('generateMissingFields')
  }, [canRunStreamGenerate, busy, project?.bible, generateReadiness, uiText])

  const styleApiStatus = useMemo(() => {
    if (busy) return { tone: 'busy' as const, label: uiText('studioApiBusy') }
    if (lastError && apiProvidersAvailable)
      return { tone: 'busy' as const, label: uiText('studioApiBusy') }
    if (apiProvidersAvailable === null)
      return { tone: 'checking' as const, label: uiText('studioApiChecking') }
    if (apiProvidersAvailable) return { tone: 'online' as const, label: uiText('studioApiOnline') }
    return { tone: 'offline' as const, label: uiText('studioApiOffline') }
  }, [busy, lastError, apiProvidersAvailable, uiText])

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
          (target instanceof HTMLElement && target.isContentEditable))
      const selectionText = window.getSelection()?.toString() || ''
      void k.uiShowContextMenu({ isEditable, selectionText })
    }
    window.addEventListener('contextmenu', onCtx)
    return () => window.removeEventListener('contextmenu', onCtx)
  }, [])

  const voiceFabTone =
    voiceMicPhase === 'listening'
      ? 'btn-voice-active'
      : voiceMicPhase === 'paused'
        ? 'btn-voice-paused'
        : voiceMicPhase === 'processing'
          ? 'btn-voice-processing'
          : voiceMicPhase === 'error'
            ? 'btn-voice-error'
            : 'btn-ghost'

  return (
    <>
      <StudioAmbientBackdrop referenceTheme />
      <StreamRevealDriver />
      <div
        className="app-shell app-shell--premium studio-mock-layout studio-mock-layout--fullscreen"
      >
      <div className="studio-mock-frame">
      <div className="studio-mock-brand-corner" role="banner">
        <div className="studio-mock-head__brand studio-mock-head__brand--corner">
          <div className="studio-mock-logo-text studio-mock-logo-text--hero">
            <BrandTitleStardust />
            <div
              className="studio-mock-logo-en studio-mock-logo-en--hero"
              style={{ ['--subtitle-drop-cycle' as string]: `${appSubtitleDropCycleSec}s` }}
              aria-label={appSubtitle}
            >
              <span className="studio-mock-logo-en-hero-label" aria-hidden>
                {appSubtitleChars.map((ch, i) => (
                  <span
                    key={`subtitle-gr-${i}-${ch}`}
                    className="studio-mock-logo-en-hero-char"
                    style={{
                      ['--subtitle-char-fr' as string]: String(
                        appSubtitleChars.length <= 1 ? 0 : i / (appSubtitleChars.length - 1)
                      ),
                    }}
                  >
                    {ch === ' ' ? '\u00a0' : ch}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
        {lastError ? (
          <div className="studio-mock-brand-error error-banner" role="alert" aria-live="assertive">
            {lastError}
          </div>
        ) : null}
      </div>
      <main className="main studio-mock-main">
        <div className="studio-mock-banner-row" aria-live="polite" aria-hidden />

        <div className="studio-mock-body">
          <div className="studio-mock-row-4">
          <div className="studio-mock-col studio-mock-col--style" id="studio-style-explorer">
            <div className="panel studio-mock-panel studio-mock-panel--fill">
              <div className="studio-mock-style-head">
                <div className="studio-mock-style-head__lead">
                  <span className="studio-mock-style-spark" aria-hidden>
                    <StudioStyleLabelIcon />
                  </span>
                  <h3>{uiText('style')}</h3>
                </div>
                <span
                  className={`studio-mock-api-status studio-mock-api-status--${styleApiStatus.tone}`}
                  title={uiText('studioApiStatusHint', { status: styleApiStatus.label })}
                  aria-label={uiText('studioApiStatusHint', { status: styleApiStatus.label })}
                  aria-live="polite"
                >
                  <span className="studio-mock-api-status__dot" aria-hidden />
                  <span className="studio-mock-api-status__label">{styleApiStatus.label}</span>
                </span>
              </div>
              <div className="studio-mock-style-split">
                <div className="studio-mock-style-grid-wrap">
                  <div className="style-grid style-grid--wireframe-six">
                    {STYLE_WIREFRAME_ORDER.map((id: VisualStyleId) => {
                      const st = STYLE_PRESETS[id]
                      if (!st) return null
                      const dynamicUrl = id === 'custom' ? undefined : stylePreviewUrls[id]
                      const previewUrl = dynamicUrl || st.previewImageUrl
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`style-card style-card--portrait style-card--wireframe-slot style-card--${id} ${
                            styleId === id ? 'selected' : ''
                          }`}
                          style={{
                            backgroundImage: `${STYLE_WIREFRAME_TILE_SCRIM}, url(${previewUrl})`
                          }}
                          onClick={() => {
                            if (id === 'custom' && styleId === 'custom') {
                              setCustomStyleOverlayOpen(true)
                            } else {
                              setStyleId(id)
                            }
                          }}
                        >
                          <span className="style-card__label">{uiText(STYLE_WIREFRAME_LABEL_KEY[id])}</span>
                        </button>
                      )
                    })}
                  </div>
                  {styleId === 'custom' && customStyleOverlayOpen ? (
                    <div className="studio-mock-custom-style-overlay" role="presentation">
                      <CustomStylePanel />
                    </div>
                  ) : null}
                </div>
                <div className="studio-mock-style-trailing">
                  <StoryWireframeQuad
                    backendGenre={backendGenre}
                    setBackendGenre={setBackendGenre}
                    backendTheme={backendTheme}
                    setBackendTheme={setBackendTheme}
                    backendLength={backendLength}
                    setBackendLength={setBackendLength}
                    narratorId={narratorId}
                    onSelectNarrator={selectNarrator}
                  />
                </div>
              </div>
            </div>
          </div>
          <div id="studio-preview-column" className="studio-mock-col studio-mock-col--preview">
            <div
              className={`studio-mock-preview-slot${busy ? ' studio-mock-preview-slot--generating' : ''}`}
            >
              <PreviewWorkspaceBackButton visible={showPreviewBack} onBack={onPreviewWorkspaceBack} />
              <StudioGenerationBanner
                visible={Boolean(busy)}
                busyLabel={busy}
                job={job}
                sceneThumbnailUrls={pipelineThumbUrls}
                sceneTotalEstimate={pipelineSceneTotalEstimate}
                onCancelPipeline={abortPipelineGenerate}
              />
              {showPostExportPreview ? (
                <Suspense fallback={<div className="studio-mock-preview-wrap workspace-premium__stage" aria-busy="true" />}>
                  <PostExportVideoWorkspace
                    videoUrl={project.lastRenderVideoUrl}
                    scenes={activeEpisode?.scenes ?? []}
                    storyLanguage={storyLanguage}
                    project={project}
                    patchProject={patchProject}
                    episodeNumber={selectedEpisode ?? project.episodes[0]?.number ?? 1}
                  />
                </Suspense>
              ) : characterPreviewChar && project?.bible ? (
                <CinematicCharacterPreview
                  characters={project.bible.characters}
                  activeCharacterId={characterPreviewChar.id}
                  seasonId={studioSeasonId}
                  busy={Boolean(busy)}
                  onCharacterIndexChange={(i) => {
                    const c = project.bible!.characters[i]
                    if (c) selectCharacterPreview(c)
                  }}
                />
              ) : showScriptReview && activeEpisode && project ? (
                <ScriptReviewWorkspace
                  project={project}
                  episode={activeEpisode}
                  busyLabel={busy}
                  onNextScene={(sceneIndex) => {
                    const ix = activeEpisode.scenes.findIndex((s) => s.index === sceneIndex)
                    const next = activeEpisode.scenes[ix + 1]
                    if (next) setEmbeddedPreviewIndex(ix + 1)
                  }}
                  patchProject={patchProject}
                />
              ) : showStoryboardPreview && activeEpisode ? (
                <StoryboardPreviewWorkspace
                  project={project}
                  episode={activeEpisode}
                  seasonId={studioSeasonId}
                  sceneUrls={renderSourceUrls}
                  heroUrl={embeddedHeroOverride}
                  carouselIndex={embeddedPreviewIndex}
                  hideCastOverlays={Boolean(characterPreviewId)}
                  onCarouselIndexChange={(i) => {
                    setCharacterPreviewId(null)
                    setEmbeddedHeroOverride(null)
                    setEmbeddedPreviewIndex(i)
                    onMonitorSceneSelect(i)
                  }}
                  busyLabel={busy}
                  jobProgress={job?.progress}
                  celebrateComplete={celebratePipelineComplete}
                  celebrateTitleKey="previewCelebrateStoryboard"
                  patchProject={patchProject}
                />
              ) : (
                <PreviewStage
                  sectionClassName={`studio-mock-preview-wrap workspace-premium__stage${project?.bible ? ' preview-stage--maximize' : ''}`}
                  seasonId={studioSeasonId}
                  sceneUrls={renderSourceUrls}
                  heroUrl={embeddedHeroOverride}
                  carouselIndex={embeddedPreviewIndex}
                  sceneCount={activeEpisode?.scenes?.length}
                  castPortraits={[]}
                  hideCastLayer
                  showSceneNav={(activeEpisode?.scenes?.length ?? 0) > 1}
                  onCarouselIndexChange={(i) => {
                    setCharacterPreviewId(null)
                    setEmbeddedHeroOverride(null)
                    setEmbeddedPreviewIndex(i)
                    onMonitorSceneSelect(i)
                  }}
                  busy={Boolean(busy)}
                  jobProgress={job?.progress}
                  celebrateComplete={celebratePipelineComplete}
                  celebrateTitleKey={
                    celebratePipelineComplete && showStoryboardPreview
                      ? 'previewCelebrateStoryboard'
                      : 'previewCelebrateReady'
                  }
                  pipelineThumbUrls={busy ? pipelineThumbUrls : []}
                  hideHeading
                  idleBlank={!renderSourceUrls.some(Boolean) && !embeddedHeroOverride}
                  useWireframeExplanation
                />
              )}
            </div>
          </div>
          <div className="studio-mock-col studio-mock-col--story">
            <div
              className={`panel studio-mock-panel${!project?.bible ? ' studio-mock-idea-panel--with-generate' : ''}`}
            >
              <h3 className="studio-mock-section-title studio-mock-section-title--split">
                <span className="studio-mock-section-title__lead">
                  <span className="studio-mock-section-title__ic" aria-hidden>
                    {Glyphs.bulb}
                  </span>
                  <span className="studio-mock-section-title__seed-cluster">
                    <span className="studio-mock-section-title__seed-headline">{uiText('ideaSeedTitleWireframe')}</span>
                  </span>
                </span>
                <span className="studio-mock-section-title__pickers">
                  <StoryLocalePicker menuPortalContainerRef={storyIdeaWrapRef} />
                </span>
              </h3>
              <div ref={storyIdeaWrapRef} className="studio-mock-idea-wrap">
                <textarea
                  id="studio-story-seed"
                  className={`idea-input idea-input--cinematic studio-mock-idea-textarea${busy || streamReveal ? ' idea-input--live-gen' : ''}`}
                  ref={ideaRef}
                  maxLength={STORY_IDEA_MAX_CHARS}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder=""
                  aria-label={uiText('ideaSeedTitleWireframe')}
                />
              </div>
              {!project?.bible ? (
                <div className="studio-mock-generate-strip">
                  <button
                    id="studio-generate-cta"
                    type="button"
                    className="btn btn-generate-cta studio-mock-generate-cta"
                    disabled={Boolean(busy) || !canRunStreamGenerate}
                    title={generateButtonTitle}
                    onClick={() => void backendGenerate()}
                  >
                    <span aria-hidden>✨</span> {uiText('wireframeCtaGenerate')}
                  </button>
                  <span className="studio-mock-voice-defaults-cluster">
                    <button
                      type="button"
                      className={`studio-mock-voice-ic${
                        voiceMicPhase === 'listening'
                          ? ' studio-mock-voice-ic--listening'
                          : voiceMicPhase === 'paused'
                            ? ' studio-mock-voice-ic--paused'
                            : voiceMicPhase === 'processing'
                              ? ' studio-mock-voice-ic--processing'
                              : voiceMicPhase === 'error'
                                ? ' studio-mock-voice-ic--error'
                                : ''
                      }`}
                      disabled={Boolean(busy) || !canUseSpeech}
                      onClick={() => void toggleVoiceToIdea()}
                      title={voiceMicTitle}
                      aria-label={uiText('voiceFabAria')}
                    >
                      <VoiceMicGlyph className="voice-mic-glyph voice-mic-glyph--strip" />
                    </button>
                  </span>
                </div>
              ) : null}
              {allEpisodesWritten ? (
                <p className="series-complete studio-mock-series-note">{uiText('seriesComplete')}</p>
              ) : null}
              {project?.bible && totalEpisodes > 1 ? (
                <EpisodeSequentialBanner flashEpisodeDone={episodeExportFlash} totalEpisodes={totalEpisodes} />
              ) : null}
              <div id="studio-story-actions" className="row studio-mock-actions-row">
                {project?.bible && wantsContinueEpisode ? (
                  <>
                    <button
                      type="button"
                      className="btn"
                      disabled={Boolean(busy) || exportGateBlocksContinue}
                      title={
                        exportGateBlocksContinue
                          ? uiText('episodeFlowExportPrevFirst')
                          : nextEpisodeNumber === totalEpisodes && totalEpisodes > 0
                            ? uiText('writeFinalEpisode', { n: nextEpisodeNumber, m: totalEpisodes })
                            : uiText('nextEpisodeCta', { n: nextEpisodeNumber, m: totalEpisodes || '—' })
                      }
                      onClick={() => {
                        if (!project) return
                        void generateEpisode(project.episodes.length ? nextEpisodeNumber : 1)
                      }}
                    >
                      <span aria-hidden>⏭</span> {uiText('wireframeCtaContinueEpisode')}
                    </button>
                    {exportGateBlocksContinue ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => skipExportGate()}
                        title={uiText('episodeFlowSkipExportGateHint')}
                      >
                        {uiText('episodeFlowSkipExportGate')}
                      </button>
                    ) : null}
                  </>
                ) : null}
                {project?.bible ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!project?.bible}
                    onClick={() => setEditMode((v) => !v)}
                    title={
                      editMode
                        ? uiText('editWireframeDoneHint')
                        : uiText('editWireframeActiveHint')
                    }
                  >
                    {editMode ? (
                      uiText('editDone')
                    ) : (
                      <>
                        <span aria-hidden>✏️</span> {uiText('wireframeCtaEditStory')}
                      </>
                    )}
                  </button>
                ) : null}
              </div>
              {project?.bible ? (
                <div className="studio-mock-episode-flow-tools">
                  {totalEpisodes > 1 && nextEpisodeNumber > 1 ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      disabled={Boolean(busy)}
                      onClick={() => {
                        setSelectedEpisode(Math.max(1, nextEpisodeNumber - 1))
                        setEditMode(true)
                      }}
                    >
                      {uiText('episodeFlowEditPrevious')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    disabled={Boolean(busy)}
                    onClick={() => endSeriesHere()}
                  >
                    {uiText('episodeFlowEndSeries')}
                  </button>
                  {totalEpisodes > 1 && canJumpToFinale(project) ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      disabled={Boolean(busy)}
                      onClick={() => generateFinaleNow()}
                    >
                      {uiText('episodeFlowGenerateFinale')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    disabled={Boolean(busy)}
                    onClick={() => spinOffSeries()}
                  >
                    {uiText('episodeFlowSpinOff')}
                  </button>
                </div>
              ) : null}
            </div>
            <div className="panel studio-mock-panel studio-mock-script-panel">
              <div ref={scriptGenDefaultsPortalRef} className="studio-mock-script-panel__portal-host">
                <StudioScriptWorkspaceTabs
                  project={project}
                  episode={activeEpisode}
                  storyGenerated={Boolean(project?.bible)}
                  scenes={scriptPanelScenes}
                  rawStructured={activeEpisode?.rawStructured}
                  busy={Boolean(busy)}
                  busyLabel={busy}
                  streamLines={job?.log?.slice(-20) ?? []}
                  streamReveal={streamReveal}
                  focusedSpeaker={focusedSceneSpeaker}
                  activeSceneIndex={activeEpisode?.scenes[embeddedPreviewIndex]?.index}
                  onSmartRegen={onMonitorSmartRegen}
                  onRegenerateMissingSceneImages={onRegenerateMissingSceneImages}
                  onGenerateFinalVideo={onGenerateFinalVideo}
                  onApproveSceneImages={approveAndGenerateAllSceneImages}
                  onRetryFailedScenes={retryFailedSceneImages}
                  onRetrySceneImage={onMonitorReplaceSceneImage}
                  onSceneFocus={(speaker, sceneIndex) => {
                    setCharacterPreviewId(null)
                    setFocusedSceneSpeaker(speaker.trim())
                    const ix =
                      activeEpisode?.scenes.findIndex((s) => s.index === sceneIndex) ?? -1
                    if (ix >= 0) {
                      onMonitorSceneSelect(ix)
                    }
                    console.info('[katha:preview]', 'script_scene_focus', { sceneIndex, ix })
                  }}
                  emptyHint={uiText('studioScriptPlaceholder')}
                />
              </div>
            </div>
        </div>
        <aside
          ref={monitorColumnRef}
          className={`studio-mock-col studio-mock-col--monitor${savedLibraryOpen || settingsOpen ? ' studio-mock-col--monitor--panel-embed' : ''}`}
        >
          <div className="studio-mock-monitor-title">
            <div className="studio-mock-monitor-title__lead">
              <span className="studio-mock-monitor-title__text">
                <span className="studio-mock-monitor-title__icon" aria-hidden>
                  <StudioMonitorLabelIcon />
                </span>
                <span className="studio-mock-monitor-title__label">{uiText('storyMonitor')}</span>
              </span>
            </div>
            <div className="studio-mock-monitor-title__icons">
              <button
                ref={studioMonitorSearchToggleRef}
                type="button"
                className="studio-mock-monitor-action-btn"
                aria-label={uiText('studioNavSearch')}
                title={uiText('studioNavSearch')}
                aria-expanded={monitorSearchOpen}
                aria-controls={
                  monitorSearchOpen ? 'studio-monitor-search-region' : undefined
                }
                onClick={() => {
                  setSavedLibraryOpen(false)
                  setSettingsOpen(false)
                  setMonitorSearchOpen((open) => {
                    if (open) {
                      setMonitorSearchQuery('')
                      return false
                    }
                    void refreshStoryHistory()
                    void refreshProjects()
                    setMonitorSearchQuery('')
                    return true
                  })
                }}
              >
                {Glyphs.navSearch}
              </button>
              <button
                type="button"
                className="studio-mock-monitor-action-btn"
                aria-label={uiText('savedLibraryTitle')}
                title={uiText('savedLibraryTitle')}
                aria-expanded={savedLibraryOpen}
                onClick={() => {
                  setMonitorSearchOpen(false)
                  setMonitorSearchQuery('')
                  setStoryHistoryOpen(false)
                  setSettingsOpen(false)
                  setSavedLibraryOpen((o) => !o)
                }}
              >
                {Glyphs.saveDisk}
              </button>
              <button
                type="button"
                className="studio-mock-monitor-action-btn"
                aria-label={uiText('studioNavHistory')}
                title={uiText('studioNavHistory')}
                aria-expanded={storyHistoryOpen}
                onClick={() => {
                  setSavedLibraryOpen(false)
                  setSettingsOpen(false)
                  setStoryHistoryOpen((wasOpen) => {
                    const next = !wasOpen
                    if (next) void refreshStoryHistory()
                    return next
                  })
                }}
              >
                {Glyphs.clock}
              </button>
              <button
                type="button"
                className="studio-mock-monitor-action-btn"
                aria-label={uiText('studioNavSettings')}
                title={uiText('studioNavSettings')}
                aria-expanded={settingsOpen}
                onClick={() => {
                  setMonitorSearchOpen(false)
                  setMonitorSearchQuery('')
                  setSavedLibraryOpen(false)
                  setStoryHistoryOpen(false)
                  setSettingsOpen(!settingsOpen)
                }}
              >
                {Glyphs.gear}
              </button>
            </div>
            <div className="studio-mock-monitor-title__fill" aria-hidden />
            <div className="studio-mock-monitor-title__locale" aria-hidden />
          </div>
          <div ref={studioMonitorBodyRef} className="studio-mock-monitor-body studio-mock-monitor-body--scroll-all">
          {monitorSearchOpen ? (
            <div
              ref={monitorSearchPanelRef}
              id="studio-monitor-search-region"
              className="studio-mock-monitor-search-host"
            >
              <StudioMonitorSearch
                query={monitorSearchQuery}
                onQueryChange={setMonitorSearchQuery}
                onClose={() => {
                  setMonitorSearchOpen(false)
                  setMonitorSearchQuery('')
                }}
                project={project}
                historyRows={storyHistoryItems.map((x) => ({ id: x.id, title: x.title }))}
                cloudRows={projectsMeta.map((x) => ({ id: x.id, title: x.title }))}
                onPickEpisode={(n) => setSelectedEpisode(n)}
                onPickBible={() => setSelectedEpisode(1)}
                onPickHistory={(id) => void loadStoryFromHistory(id)}
                onPickCloud={(id) => void loadProject(id)}
              />
            </div>
          ) : savedLibraryOpen ? (
            <Suspense fallback={<div className="studio-mock-monitor-placeholder" aria-busy="true" />}>
              <SavedProjectsWindow
                variant="monitor"
                onClose={() => setSavedLibraryOpen(false)}
                onLoadInStudio={(id) => {
                  void loadStoryFromHistory(id)
                  setSavedLibraryOpen(false)
                }}
              />
            </Suspense>
          ) : storyHistoryOpen ? (
            <div className="panel studio-mock-panel" aria-label={uiText('storyHistoryPopoverTitle')}>
              <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontWeight: 800, letterSpacing: '0.04em' }}>{uiText('storyHistoryPopoverTitle')}</div>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setStoryHistoryOpen(false)}
                >
                  {uiText('close')}
                </button>
              </div>
              <p style={{ margin: '8px 0 10px', color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                {uiText('storyHistoryHint')}
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {[...storyHistoryItems]
                  .sort((a, b) => {
                    const ao = isOngoingHistoryStatus(a.status) ? 1 : 0
                    const bo = isOngoingHistoryStatus(b.status) ? 1 : 0
                    if (bo !== ao) return bo - ao
                    const ta = new Date(a.updatedAt || 0).getTime()
                    const tb = new Date(b.updatedAt || 0).getTime()
                    return tb - ta
                  })
                  .map((row) => (
                    <div
                      key={row.id}
                      className="row"
                      style={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '8px 8px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'rgba(0,0,0,0.18)'
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: 0,
                          background: 'transparent'
                        }}
                        onClick={() => {
                          void loadStoryFromHistory(row.id)
                          setStoryHistoryOpen(false)
                        }}
                      >
                        <span style={{ minWidth: 0, display: 'grid' }}>
                          <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.title || '—'}
                          </span>
                          <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                            {row.updatedAt
                              ? new Date(row.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                              : '—'}
                          </span>
                        </span>
                        <span className="badge">{row.status}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        title={uiText('storyHistoryDelete')}
                        aria-label={uiText('storyHistoryDelete')}
                        onClick={() => {
                          if (!window.confirm(uiText('storyHistoryConfirmDelete'))) return
                          void deleteStoryFromHistory(row.id)
                        }}
                      >
                        {Glyphs.multiply}
                      </button>
                    </div>
                  ))}
                {storyHistoryItems.length === 0 ? (
                  <p className="studio-mock-monitor-placeholder" style={{ margin: 0 }}>
                    {uiText('storyHistoryEmpty')}
                  </p>
                ) : null}
              </div>
            </div>
          ) : settingsOpen && helpCenterOpen ? (
            <Suspense fallback={<div className="studio-mock-monitor-placeholder" aria-busy="true" />}>
              <MonitorUserGuide onBack={() => setHelpCenterOpen(false)} />
            </Suspense>
          ) : settingsOpen ? (
            <MonitorSettingsPanel
              onClose={() => setSettingsOpen(false)}
              onOpenHelpCenter={() => setHelpCenterOpen(true)}
              onRequestAuth={() => {
                setSettingsOpen(false)
                setAuthModalOpen(true)
              }}
              onSignOut={() => void signOut()}
              onStartNewStory={() => {
                setSettingsOpen(false)
                onStartNewStory()
              }}
            />
          ) : !project ? (
            <p className="studio-mock-monitor-placeholder">
              {streamReveal || busy === 'generating'
                ? uiText('studioMonitorLiveInScriptPanel')
                : uiText('noProject')}
            </p>
          ) : (
            <>
              {activeEpisode?.scenes?.length ? (
                <section
                  className="studio-mock-monitor-section studio-mock-monitor-section--storyboard"
                  aria-labelledby="cine-sb-monitor-title"
                >
                  <CinematicStoryboardMonitor
                    project={project}
                    episode={activeEpisode}
                    activeTileIndex={embeddedPreviewIndex}
                    onActiveTileIndexChange={onMonitorSceneSelect}
                    busyLabel={busy}
                    scrollContainerRef={studioMonitorBodyRef}
                    onRegenerateScene={onMonitorRegenerateScene}
                    onGenerateSceneImage={onMonitorGenerateSceneImage}
                    onReplaceSceneImage={onMonitorReplaceSceneImage}
                  />
                </section>
              ) : null}

              <section
                className={`studio-mock-monitor-section studio-mock-monitor-section--characters${!charactersMonitorOpen ? ' studio-mock-monitor-section--characters-collapsed' : ''}`}
                aria-labelledby="studio-wireframe-characters"
              >
                <div className="studio-mock-monitor-section__head-row">
                  <h3 id="studio-wireframe-characters" className="studio-mock-wireframe-monitor-h">
                    {uiText('characters')}
                  </h3>
                  {activeEpisode?.scenes?.length ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      aria-expanded={charactersMonitorOpen}
                      onClick={() => setCharactersMonitorOpen((o) => !o)}
                    >
                      {charactersMonitorOpen ? '−' : '+'}
                    </button>
                  ) : null}
                </div>
                <div
                  className={`panel studio-mock-panel studio-mock-characters-wireframe-panel${characterPreviewChar ? ' studio-mock-characters-wireframe-panel--character-preview' : ''}`}
                >
                {project.bible?.characters.map((c) => (
                  <MonitorCharacterCard
                    key={c.id}
                    character={c}
                    highlighted={
                      focusedSceneSpeaker != null && namesMatch(c.name, focusedSceneSpeaker)
                    }
                    editMode={editMode}
                    storyMetaLocked={storyMetaLocked}
                    busy={Boolean(busy)}
                    showReferenceControls
                    characterId={c.id}
                    onPreview={() => selectCharacterPreview(c)}
                    onGeneratePortrait={() => void generateCharacterBase(c.id)}
                    onReplacePortrait={() => void generateCharacterBase(c.id)}
                    onNameChange={(name) =>
                      patchProject((p) => {
                        if (!p.bible) return p
                        return {
                          ...p,
                          bible: {
                            ...p.bible,
                            characters: p.bible.characters.map((x) =>
                              x.id === c.id ? { ...x, name } : x
                            )
                          }
                        }
                      })
                    }
                    onPersonalityChange={(personality) =>
                      patchProject((p) => {
                        if (!p.bible) return p
                        return {
                          ...p,
                          bible: {
                            ...p.bible,
                            characters: p.bible.characters.map((x) =>
                              x.id === c.id ? { ...x, personality } : x
                            )
                          }
                        }
                      })
                    }
                  />
                )) ?? null}
                </div>
              </section>

              <section
                className="studio-mock-monitor-section studio-mock-monitor-section--episodes"
                aria-labelledby="studio-wireframe-episodes"
              >
                <h3 id="studio-wireframe-episodes" className="studio-mock-wireframe-monitor-h">
                  {uiText('episodes')}
                </h3>
                <MonitorEpisodeAccordion project={project} />
              </section>

              {activeEpisode?.scenes?.length ? (
                <section className="studio-mock-monitor-section studio-mock-monitor-section--creator" aria-labelledby="studio-wireframe-creator">
                  <div className="studio-mock-monitor-section__head-row">
                    <h3 id="studio-wireframe-creator" className="studio-mock-wireframe-monitor-h">
                      {uiText('creatorStudioTitle')}
                    </h3>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      aria-expanded={creatorStudioOpen}
                      onClick={() => setCreatorStudioOpen((o) => !o)}
                    >
                      {creatorStudioOpen ? '−' : '+'}
                    </button>
                  </div>
                  {creatorStudioOpen ? (
                    <div className="panel studio-mock-panel creator-studio-panel-wrap">
                      <CreatorStudioPanel
                        project={project}
                        episode={activeEpisode}
                        episodeNumber={selectedEpisode ?? activeEpisode.number}
                        patchProject={patchProject}
                        thumbnailUrl={renderSourceUrls[0] ?? null}
                      />
                    </div>
                  ) : null}
                </section>
              ) : null}
            </>
          )}
          </div>
        </aside>
        </div>
        </div>
      </main>

      </div>

      <SeriesCompleteRewardModal
        open={seriesRewardOpen}
        title={project?.title ?? ''}
        onClose={() => {
          setSeriesRewardOpen(false)
          try {
            if (project?.id) sessionStorage.setItem(`katha:series-reward:${project.id}`, '1')
          } catch {
            /* ignore */
          }
        }}
        onAction={() => {
          /* Actions show inline “coming soon” hint inside modal */
        }}
      />

      {authModalOpen ? (
        <div className="modal-backdrop" onClick={() => setAuthModalOpen(false)} role="presentation">
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{uiText('authModalTitle')}</h2>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>{uiText('authModalBlurb')}</p>
            <div className="row" style={{ marginTop: 12 }}>
              <input
                className="select"
                style={{ flex: 1 }}
                value={authEmailInput}
                onChange={(e) => setAuthEmailInput(e.target.value)}
                placeholder={uiText('authEmailPlaceholder')}
              />
              <button type="button" className="btn" onClick={() => void signIn()} disabled={Boolean(busy)}>
                {uiText('authSendLink')}
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setAuthModalOpen(false)}>
                {uiText('close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
    </>
  )
}
