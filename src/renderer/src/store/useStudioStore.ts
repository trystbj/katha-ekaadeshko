import { create } from 'zustand'
import type { AspectSelection, NarrationSettings, ProjectState, StyleSelection } from '../types/story'
import {
  DEFAULT_ASPECT,
  DEFAULT_BACKEND_GENRE,
  DEFAULT_BACKEND_LENGTH,
  DEFAULT_BACKEND_THEME,
  DEFAULT_NARRATOR_ID,
  DEFAULT_STORY_COUNTRY,
  DEFAULT_STORY_LANGUAGE,
  DEFAULT_STYLE_ID,
  DEFAULT_UI_LANGUAGE
} from '../constants/studioDefaults'
import type { StudioSeasonId } from '../constants/studioSeasonThemes'
import { DEFAULT_STUDIO_SEASON } from '../constants/studioSeasonThemes'
import type { VisualThemePackId } from '../constants/visualThemePacks'
import { DEFAULT_VISUAL_THEME_PACK_ID } from '../constants/visualThemePacks'
import type { StoryBible } from '../types/story'
import { uiTextGlobal } from '../i18n/uiTextGlobal'
import { normalizeNarratorId } from '../constants/narrators'
import { normalizeUiLanguageCode } from '../i18n/resources'
import { STORY_IDEA_MAX_CHARS } from '../constants/storyIdeaLimits'
import {
  composeCustomVisualPrompt,
  parseCustomVisualPrompt,
  type RecentCustomStyleEntry,
  upsertRecentCustomStyle
} from '../utils/customStyleCompose'
import { loadPersistedCustomStyles, savePersistedCustomStyles } from '../utils/customStylePersistence'
import {
  DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID,
  isSubtitlePlaybackPresetId
} from '../constants/subtitlePlaybackPresets'
import { pushStoryToCloudIfSignedIn, pushStoryToHistory } from '../utils/storyHistory'
import type { WorkspaceSlotSnapshot } from '../types/workspaceSlot'
import {
  emptyWorkspaceSlot,
  normalizeWorkspaceSlot,
  snapshotFromStore,
  workspaceFingerprint,
  type WorkspaceSnapshotSource
} from '../utils/workspaceSlotSnapshot'
import { loadWorkspaceSlotsDisk, saveWorkspaceSlotsDisk } from '../utils/workspaceSlotsStorage'
import { newProjectId } from '../types/story'
import { migrateVisualStyleId, resolveVisualStyleId } from '../utils/styleIdMigration'
import {
  createDefaultNarrationSettings,
  sanitizeNarrationSettingsLanguage
} from '../constants/narrationLanguages'

const persistedCustom =
  typeof window !== 'undefined'
    ? loadPersistedCustomStyles()
    : { recent: [], description: '', mood: '', intensity: '', environment: '' }
export type ThemeChoice = 'light' | 'dark' | 'system'

export type StreamRevealState = {
  fullDoc: string
  visibleLen: number
  paused: boolean
  typingSound: boolean
  pendingProject: ProjectState
}

export interface StudioState {
  theme: ThemeChoice
  /** App UI (i18n). Empty = use English until the user picks. */
  uiLanguage: string
  /** UI language requested; the app switches after full bundle is ready. */
  uiLanguagePending: string | null
  /** Language for generated story text (bible, episodes). */
  storyLanguage: string
  /** Region/country for prompts (`jobs-stream-generate`); English name as in locale list. */
  storyCountry: string
  idea: string
  /** Shown only before the first bible generate; applied as project + bible title. */
  workingTitle: string
  /** Optional hint before first generate; applied to the first character name when set. */
  mainCharacterName: string
  backendTheme: string
  backendGenre: string
  backendLength: string
  /** Used when `project` is null; copied into the project on first generate. */
  uiFontMode: 'clean' | 'story' | 'comic'
  styleId: StyleSelection
  aspectMode: AspectSelection
  narratorId: string
  /** Draft narrator language/voice settings (copied into project on first generate if project is null). */
  narrationDraft: NarrationSettings
  project: ProjectState | null
  busy: string | null
  lastError: string | null
  settingsOpen: boolean
  projectPickerOpen: boolean
  selectedEpisode: number | null
  authEmail: string | null
  job: { id: string; stage: string; progress: number; log: string[] } | null
  /** Nepal seasonal studio backdrop (visual only). */
  studioSeasonId: StudioSeasonId
  /** Extended Nepal poster packs — maps to base VisualStyleId + extra prompt cue. */
  visualPackId: VisualThemePackId
  /** Soft tone hint merged into generation seeds (empty = neutral). */
  storyTone: '' | 'warm' | 'tense' | 'epic' | 'tender' | 'whimsical' | 'noir'
  /** Prefer serialized cliffhanger continuity in prompts. */
  episodeChainPreferred: boolean
  /** Composed custom visual line for generation when `styleId` is `custom`. */
  customVisualPrompt: string
  customStyleDescription: string
  /** Recently generated custom styles (max 8, auto-removed after 30 days). */
  recentCustomStyles: RecentCustomStyleEntry[]
  /** Composer overlay over style tiles when `styleId` is `custom`. */
  customStyleOverlayOpen: boolean
  /** After a worker render: HTML5 subtitle track visibility in the video player. */
  playbackSubtitlesOn: boolean
  /** WebVTT cue styling (colors, size, vertical position); cue times follow scene narration pacing. */
  subtitlePlaybackPresetId: string
  /** Live typing reveal after `/api/jobs-stream-generate` returns (before project commit). */
  streamReveal: StreamRevealState | null
  /** Abort in-flight stream fetch (Generate Story). */
  generationAbort: AbortController | null
  /** Per-workspace runtime state so background jobs continue while switching projects. */
  workspaceRuntime: Array<{
    busy: string | null
    lastError: string | null
    job: StudioState['job']
    streamReveal: StreamRevealState | null
    generationAbort: AbortController | null
  }>
  setGenerationAbort: (c: AbortController | null) => void
  abortGenerationInFlight: () => void
  startStreamReveal: (fullDoc: string, pendingProject: ProjectState) => void
  setStreamRevealPaused: (paused: boolean) => void
  toggleStreamRevealTypingSound: () => void
  skipStreamRevealToEnd: () => void
  finalizeStreamReveal: () => void
  clearStreamRevealDiscard: () => void
  setTheme: (t: ThemeChoice) => void
  setUiLanguage: (lng: string) => void
  setUiLanguagePending: (lng: string | null) => void
  setStoryLanguage: (lng: string) => void
  setStoryCountry: (country: string) => void
  setIdea: (s: string) => void
  setWorkingTitle: (s: string) => void
  setMainCharacterName: (s: string) => void
  setUiFontMode: (m: 'clean' | 'story' | 'comic') => void
  setBackendTheme: (s: string) => void
  setBackendGenre: (s: string) => void
  setBackendLength: (s: string) => void
  setStyleId: (s: StyleSelection) => void
  setCustomStyleOverlayOpen: (open: boolean) => void
  dismissCustomStyleOverlay: () => void
  setAspectMode: (a: AspectSelection) => void
  setNarratorId: (id: string) => void
  setNarrationDraft: (n: NarrationSettings) => void
  setProject: (p: ProjectState | null) => void
  patchProject: (fn: (p: ProjectState) => ProjectState) => void
  setBusy: (m: string | null) => void
  setError: (e: string | null) => void
  setSettingsOpen: (v: boolean) => void
  setProjectPickerOpen: (v: boolean) => void
  setSelectedEpisode: (n: number | null) => void
  setAuthEmail: (email: string | null) => void
  setJob: (j: StudioState['job']) => void
  /** Workspace-scoped runtime setters (used by background generation jobs). */
  setWorkspaceBusy: (ix: number, busy: string | null) => void
  setWorkspaceError: (ix: number, err: string | null) => void
  setWorkspaceJob: (ix: number, job: StudioState['job']) => void
  setWorkspaceStreamReveal: (ix: number, sr: StreamRevealState | null) => void
  setWorkspaceGenerationAbort: (ix: number, ac: AbortController | null) => void
  /** Workspace-scoped project helpers (used by background generation jobs). */
  setWorkspaceProject: (ix: number, p: ProjectState | null) => void
  patchWorkspaceProject: (ix: number, fn: (p: ProjectState) => ProjectState) => void
  /** Create a new project workspace in the first empty slot. */
  createNewWorkspaceProject: () => { ok: true; index: number } | { ok: false; reason: 'full' }
  setStudioSeasonId: (id: StudioSeasonId) => void
  setVisualPackId: (id: VisualThemePackId) => void
  setStoryTone: (t: StudioState['storyTone']) => void
  setEpisodeChainPreferred: (v: boolean) => void
  setCustomVisualPrompt: (s: string) => void
  setCustomStyleFields: (parts: Partial<{ description: string }>) => void
  applyRecentCustomStyle: (line: string) => void
  /** Call after a successful generate with custom style. */
  touchRecentCustomStyle: (line: string) => void
  setPlaybackSubtitlesOn: (v: boolean) => void
  setSubtitlePlaybackPresetId: (id: string) => void
  hydrateStudioFromBible: (bible: StoryBible | null | undefined) => void
  newBlankProject: () => void
  /** Five parallel story workspaces (disk-backed). */
  workspaceSlots: WorkspaceSlotSnapshot[]
  activeWorkspaceSlotIndex: number
  initializeWorkspaceSlots: () => void
  switchWorkspaceSlot: (to: number) => 'ok' | 'busy' | 'invalid'
  duplicateWorkspaceSlot: (from: number) => 'ok' | 'full' | 'invalid'
  clearWorkspaceSlot: (index: number) => void
  setWorkspaceSlotArchived: (index: number, archived: boolean) => void
  renameWorkspaceSlot: (index: number, title: string) => void
}

function persistCustomSlice(
  state: Pick<StudioState, 'customStyleDescription' | 'recentCustomStyles'>
) {
  savePersistedCustomStyles({
    description: state.customStyleDescription,
    recent: state.recentCustomStyles
  })
}

function syncComposedCustomPrompt(
  set: (p: Partial<StudioState>) => void,
  get: () => StudioState,
  description: string
) {
  const customStyleDescription = description
  const customVisualPrompt = composeCustomVisualPrompt(description)
  const next = { customStyleDescription, customVisualPrompt }
  set(next)
  persistCustomSlice({ ...get(), ...next })
}

let workspaceBootstrapDone = false
let workspaceApplyDepth = 0
let lastWorkspaceFingerprint = ''
let workspaceAutosaveTimer: ReturnType<typeof setTimeout> | undefined

function workspaceSnapshotSource(get: () => StudioState): WorkspaceSnapshotSource {
  const s = get()
  return {
    activeWorkspaceSlotIndex: s.activeWorkspaceSlotIndex,
    workspaceSlots: s.workspaceSlots,
    storyLanguage: s.storyLanguage,
    storyCountry: s.storyCountry,
    idea: s.idea,
    workingTitle: s.workingTitle,
    mainCharacterName: s.mainCharacterName,
    backendTheme: s.backendTheme,
    backendGenre: s.backendGenre,
    backendLength: s.backendLength,
    uiFontMode: s.uiFontMode,
    styleId: s.styleId,
    aspectMode: s.aspectMode,
    narratorId: s.narratorId,
    narrationDraft: s.narrationDraft,
    studioSeasonId: s.studioSeasonId,
    visualPackId: s.visualPackId,
    storyTone: s.storyTone,
    episodeChainPreferred: s.episodeChainPreferred,
    customVisualPrompt: s.customVisualPrompt,
    playbackSubtitlesOn: s.playbackSubtitlesOn,
    subtitlePlaybackPresetId: s.subtitlePlaybackPresetId,
    selectedEpisode: s.selectedEpisode,
    project: s.project,
    busy: s.busy,
    streamReveal: s.streamReveal ? { visibleLen: s.streamReveal.visibleLen } : null,
    job: s.job ? { progress: s.job.progress } : null
  }
}

function normalizeWorkspaceIndex(ix: number): number | null {
  if (ix < 0 || ix > 4 || ix !== Math.floor(ix)) return null
  return ix
}

function applyRuntimeFromWorkspace(set: (p: Partial<StudioState>) => void, get: () => StudioState, ix: number) {
  const i = normalizeWorkspaceIndex(ix)
  if (i == null) return
  const rt = get().workspaceRuntime[i]
  set({
    busy: rt?.busy ?? null,
    lastError: rt?.lastError ?? null,
    job: rt?.job ?? null,
    streamReveal: rt?.streamReveal ?? null,
    generationAbort: rt?.generationAbort ?? null
  })
}

export const useStudioStore = create<StudioState>((set, get) => ({
  theme: 'system',
  /** App (menus): default English; change only in Settings. */
  uiLanguage: normalizeUiLanguageCode(
    (typeof localStorage !== 'undefined' && localStorage.getItem('katha_ui_language')) || DEFAULT_UI_LANGUAGE
  ),
  uiLanguagePending: null,
  storyLanguage: DEFAULT_STORY_LANGUAGE,
  storyCountry: DEFAULT_STORY_COUNTRY,
  idea: '',
  workingTitle: '',
  mainCharacterName: '',
  backendTheme: DEFAULT_BACKEND_THEME,
  backendGenre: DEFAULT_BACKEND_GENRE,
  backendLength: DEFAULT_BACKEND_LENGTH,
  uiFontMode: 'story',
  styleId: DEFAULT_STYLE_ID as StyleSelection,
  aspectMode: DEFAULT_ASPECT as AspectSelection,
  narratorId: DEFAULT_NARRATOR_ID,
  narrationDraft: createDefaultNarrationSettings(),
  project: null,
  busy: null,
  lastError: null,
  settingsOpen: false,
  projectPickerOpen: false,
  selectedEpisode: null,
  authEmail: null,
  job: null,
  studioSeasonId: DEFAULT_STUDIO_SEASON,
  visualPackId: DEFAULT_VISUAL_THEME_PACK_ID,
  storyTone: '',
  episodeChainPreferred: false,
  customStyleDescription: persistedCustom.description,
  customVisualPrompt: composeCustomVisualPrompt(persistedCustom.description),
  recentCustomStyles: persistedCustom.recent,
  customStyleOverlayOpen: false,
  playbackSubtitlesOn: true,
  subtitlePlaybackPresetId: DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID,
  workspaceSlots: [
    emptyWorkspaceSlot(),
    emptyWorkspaceSlot(),
    emptyWorkspaceSlot(),
    emptyWorkspaceSlot(),
    emptyWorkspaceSlot()
  ],
  activeWorkspaceSlotIndex: 0,
  streamReveal: null,
  generationAbort: null,
  workspaceRuntime: [
    { busy: null, lastError: null, job: null, streamReveal: null, generationAbort: null },
    { busy: null, lastError: null, job: null, streamReveal: null, generationAbort: null },
    { busy: null, lastError: null, job: null, streamReveal: null, generationAbort: null },
    { busy: null, lastError: null, job: null, streamReveal: null, generationAbort: null },
    { busy: null, lastError: null, job: null, streamReveal: null, generationAbort: null }
  ],
  setGenerationAbort: (generationAbort) => set({ generationAbort }),
  abortGenerationInFlight: () => {
    const ac = get().generationAbort
    ac?.abort()
    const ix = get().activeWorkspaceSlotIndex
    const rt = [...get().workspaceRuntime]
    if (rt[ix]) rt[ix] = { ...rt[ix], generationAbort: null, streamReveal: null, busy: null, job: null }
    set({ generationAbort: null, streamReveal: null, busy: null, job: null, workspaceRuntime: rt })
  },
  startStreamReveal: (fullDoc, pendingProject) => {
    const typingSound =
      typeof localStorage !== 'undefined' && localStorage.getItem('katha_live_typing_sound') === '1'
    const ix = get().activeWorkspaceSlotIndex
    const sr: StreamRevealState = {
      fullDoc,
      visibleLen: 0,
      paused: false,
      typingSound,
      pendingProject
    }
    const rt = [...get().workspaceRuntime]
    rt[ix] = { ...rt[ix], streamReveal: sr }
    set({ streamReveal: sr, workspaceRuntime: rt })
  },
  setStreamRevealPaused: (paused) => {
    const sr = get().streamReveal
    if (!sr) return
    const next = { ...sr, paused }
    const ix = get().activeWorkspaceSlotIndex
    const rt = [...get().workspaceRuntime]
    rt[ix] = { ...rt[ix], streamReveal: next }
    set({ streamReveal: next, workspaceRuntime: rt })
  },
  toggleStreamRevealTypingSound: () => {
    const sr = get().streamReveal
    if (!sr) return
    const next = !sr.typingSound
    try {
      localStorage.setItem('katha_live_typing_sound', next ? '1' : '0')
    } catch {
      /* ignore */
    }
    const nextSr = { ...sr, typingSound: next }
    const ix = get().activeWorkspaceSlotIndex
    const rt = [...get().workspaceRuntime]
    rt[ix] = { ...rt[ix], streamReveal: nextSr }
    set({ streamReveal: nextSr, workspaceRuntime: rt })
  },
  skipStreamRevealToEnd: () => {
    const sr = get().streamReveal
    if (!sr) return
    const next = { ...sr, visibleLen: sr.fullDoc.length }
    const ix = get().activeWorkspaceSlotIndex
    const rt = [...get().workspaceRuntime]
    rt[ix] = { ...rt[ix], streamReveal: next }
    set({ streamReveal: next, workspaceRuntime: rt })
  },
  finalizeStreamReveal: () => {
    const sr = get().streamReveal
    if (!sr?.pendingProject) return
    const next = sr.pendingProject
    const bible = next.bible
    if (bible?.styleId === 'custom' && bible.customVisualPrompt?.trim()) {
      get().touchRecentCustomStyle(bible.customVisualPrompt.trim())
    }
    const ix = get().activeWorkspaceSlotIndex
    const rt = [...get().workspaceRuntime]
    rt[ix] = { ...rt[ix], streamReveal: null }
    set({ streamReveal: null, workspaceRuntime: rt })
    get().setProject(next)
    void pushStoryToHistory(next)
    void pushStoryToCloudIfSignedIn(next)
    set({ busy: null })
  },
  clearStreamRevealDiscard: () => {
    const ix = get().activeWorkspaceSlotIndex
    const rt = [...get().workspaceRuntime]
    rt[ix] = { ...rt[ix], streamReveal: null }
    set({ streamReveal: null, workspaceRuntime: rt })
  },
  setTheme: (theme) => set({ theme }),
  setUiLanguage: (uiLanguage) => set({ uiLanguage: normalizeUiLanguageCode(uiLanguage) }),
  setUiLanguagePending: (uiLanguagePending) => set({ uiLanguagePending }),
  setStoryLanguage: (storyLanguage) => set({ storyLanguage }),
  setStoryCountry: (storyCountry) => set({ storyCountry }),
  setIdea: (idea) => set({ idea: String(idea ?? '').slice(0, STORY_IDEA_MAX_CHARS) }),
  setWorkingTitle: (workingTitle) => set({ workingTitle }),
  setMainCharacterName: (mainCharacterName) => set({ mainCharacterName }),
  setUiFontMode: (uiFontMode) => set({ uiFontMode }),
  setBackendTheme: (backendTheme) => set({ backendTheme }),
  setBackendGenre: (backendGenre) => set({ backendGenre }),
  setBackendLength: (backendLength) => set({ backendLength }),
  setStyleId: (styleId) => {
    const migrated = migrateVisualStyleId(styleId) as StyleSelection
    if (migrated === 'custom') {
      set({ styleId: migrated, customStyleOverlayOpen: true })
    } else {
      set({ styleId: migrated, customStyleOverlayOpen: false })
    }
  },
  setCustomStyleOverlayOpen: (customStyleOverlayOpen) => set({ customStyleOverlayOpen }),
  dismissCustomStyleOverlay: () => set({ customStyleOverlayOpen: false }),
  setAspectMode: (aspectMode) => set({ aspectMode }),
  setNarratorId: (narratorId) => set({ narratorId: normalizeNarratorId(narratorId) }),
  setNarrationDraft: (narrationDraft) =>
    set({ narrationDraft: sanitizeNarrationSettingsLanguage(narrationDraft) }),
  setProject: (project) => {
    if (!project) {
      set({ project: null, selectedEpisode: null })
      return
    }
    let next: ProjectState = {
      ...project,
      narration: project.narration ? sanitizeNarrationSettingsLanguage(project.narration) : project.narration
    }
    if (next.bible?.narratorId != null && String(next.bible.narratorId).trim() !== '') {
      next = {
        ...next,
        bible: {
          ...next.bible,
          narratorId: normalizeNarratorId(next.bible.narratorId)
        }
      }
    }
    set({
      project: next,
      selectedEpisode: next.episodes.length ? next.episodes[next.episodes.length - 1].number : null
    })
  },
  patchProject: (fn) => {
    const p = get().project
    if (!p) return
    set({ project: fn(p) })
  },
  setBusy: (busy) => {
    const ix = get().activeWorkspaceSlotIndex
    const rt = [...get().workspaceRuntime]
    rt[ix] = { ...rt[ix], busy }
    set({ busy, workspaceRuntime: rt })
  },
  setError: (lastError) => {
    const ix = get().activeWorkspaceSlotIndex
    const rt = [...get().workspaceRuntime]
    rt[ix] = { ...rt[ix], lastError }
    set({ lastError, workspaceRuntime: rt })
  },
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setProjectPickerOpen: (projectPickerOpen) => set({ projectPickerOpen }),
  setSelectedEpisode: (selectedEpisode) => set({ selectedEpisode }),
  setAuthEmail: (authEmail) => set({ authEmail }),
  setJob: (job) => {
    const ix = get().activeWorkspaceSlotIndex
    const rt = [...get().workspaceRuntime]
    rt[ix] = { ...rt[ix], job }
    set({ job, workspaceRuntime: rt })
  },
  setWorkspaceBusy: (ix, busy) => {
    const i = normalizeWorkspaceIndex(ix)
    if (i == null) return
    const rt = [...get().workspaceRuntime]
    rt[i] = { ...rt[i], busy }
    set({ workspaceRuntime: rt })
    if (i === get().activeWorkspaceSlotIndex) set({ busy })
  },
  setWorkspaceError: (ix, lastError) => {
    const i = normalizeWorkspaceIndex(ix)
    if (i == null) return
    const rt = [...get().workspaceRuntime]
    rt[i] = { ...rt[i], lastError }
    set({ workspaceRuntime: rt })
    if (i === get().activeWorkspaceSlotIndex) set({ lastError })
  },
  setWorkspaceJob: (ix, job) => {
    const i = normalizeWorkspaceIndex(ix)
    if (i == null) return
    const rt = [...get().workspaceRuntime]
    rt[i] = { ...rt[i], job }
    set({ workspaceRuntime: rt })
    if (i === get().activeWorkspaceSlotIndex) set({ job })
  },
  setWorkspaceStreamReveal: (ix, streamReveal) => {
    const i = normalizeWorkspaceIndex(ix)
    if (i == null) return
    const rt = [...get().workspaceRuntime]
    rt[i] = { ...rt[i], streamReveal }
    set({ workspaceRuntime: rt })
    if (i === get().activeWorkspaceSlotIndex) set({ streamReveal })
  },
  setWorkspaceGenerationAbort: (ix, generationAbort) => {
    const i = normalizeWorkspaceIndex(ix)
    if (i == null) return
    const rt = [...get().workspaceRuntime]
    rt[i] = { ...rt[i], generationAbort }
    set({ workspaceRuntime: rt })
    if (i === get().activeWorkspaceSlotIndex) set({ generationAbort })
  },
  setWorkspaceProject: (ix, project) => {
    const i = normalizeWorkspaceIndex(ix)
    if (i == null) return
    const slots = [...get().workspaceSlots]
    slots[i] = { ...slots[i], project }
    set({ workspaceSlots: slots })
    if (i === get().activeWorkspaceSlotIndex) {
      set({
        project,
        selectedEpisode: project?.episodes.length ? project.episodes[project.episodes.length - 1].number : null
      })
    }
  },
  patchWorkspaceProject: (ix, fn) => {
    const i = normalizeWorkspaceIndex(ix)
    if (i == null) return
    const slots = [...get().workspaceSlots]
    const cur = slots[i]?.project
    if (!cur) return
    const next = fn(cur)
    slots[i] = { ...slots[i], project: next }
    set({ workspaceSlots: slots })
    if (i === get().activeWorkspaceSlotIndex) set({ project: next })
  },
  createNewWorkspaceProject: () => {
    const slots = [...get().workspaceSlots]
    const emptyIx = slots.findIndex((s) => !s.project && !s.studio.idea.trim())
    if (emptyIx < 0) return { ok: false, reason: 'full' } as const
    slots[emptyIx] = emptyWorkspaceSlot()
    set({ workspaceSlots: slots })
    saveWorkspaceSlotsDisk({ v: 1, activeIndex: get().activeWorkspaceSlotIndex, slots })
    return { ok: true, index: emptyIx } as const
  },
  setStudioSeasonId: (studioSeasonId) => set({ studioSeasonId }),
  setVisualPackId: (visualPackId) => set({ visualPackId }),
  setStoryTone: (storyTone) => set({ storyTone }),
  setEpisodeChainPreferred: (episodeChainPreferred) => set({ episodeChainPreferred }),
  setCustomVisualPrompt: (customVisualPrompt) => {
    syncComposedCustomPrompt(set, get, parseCustomVisualPrompt(customVisualPrompt))
  },
  setCustomStyleFields: (parts) => {
    const description = parts.description ?? get().customStyleDescription
    syncComposedCustomPrompt(set, get, description)
  },
  applyRecentCustomStyle: (line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    syncComposedCustomPrompt(set, get, parseCustomVisualPrompt(trimmed))
  },
  touchRecentCustomStyle: (line) => {
    const recent = upsertRecentCustomStyle(get().recentCustomStyles, line)
    set({ recentCustomStyles: recent })
    persistCustomSlice({ ...get(), recentCustomStyles: recent })
  },
  setPlaybackSubtitlesOn: (playbackSubtitlesOn) => set({ playbackSubtitlesOn }),
  setSubtitlePlaybackPresetId: (id) =>
    set({
      subtitlePlaybackPresetId: isSubtitlePlaybackPresetId(id) ? id : DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID
    }),
  hydrateStudioFromBible: (bible) => {
    if (!bible) return
    const prev = get()
    const styleId = resolveVisualStyleId(bible.styleId)
    if (bible.styleId === 'custom' && bible.customVisualPrompt?.trim()) {
      syncComposedCustomPrompt(set, get, parseCustomVisualPrompt(bible.customVisualPrompt))
    }
    set({
      styleId,
      aspectMode: DEFAULT_ASPECT as AspectSelection,
      narratorId: normalizeNarratorId(bible.narratorId ?? prev.narratorId)
    })
    const proj = get().project
    if (proj?.bible && proj.bible.aspectMode !== DEFAULT_ASPECT) {
      const cur = proj
      const b = cur.bible
      const bibleNorm = { ...b, aspectMode: DEFAULT_ASPECT } as StoryBible
      set({
        project: {
          ...cur,
          bible: bibleNorm,
          updatedAt: new Date().toISOString()
        }
      })
    }
    if (bible.styleId === 'custom') {
      persistCustomSlice(get())
    }
  },
  newBlankProject: () => {
    const recent = get().recentCustomStyles
    get().generationAbort?.abort()
    set({
      project: null,
      selectedEpisode: null,
      lastError: null,
      job: null,
      streamReveal: null,
      generationAbort: null,
      narratorId: DEFAULT_NARRATOR_ID,
      styleId: DEFAULT_STYLE_ID as StyleSelection,
      aspectMode: DEFAULT_ASPECT as AspectSelection,
      backendTheme: DEFAULT_BACKEND_THEME,
      backendGenre: DEFAULT_BACKEND_GENRE,
      backendLength: DEFAULT_BACKEND_LENGTH,
      storyLanguage: DEFAULT_STORY_LANGUAGE,
      storyCountry: DEFAULT_STORY_COUNTRY,
      uiLanguage: DEFAULT_UI_LANGUAGE,
      idea: '',
      workingTitle: '',
      mainCharacterName: '',
      uiFontMode: 'story' as 'clean' | 'story' | 'comic',
      visualPackId: DEFAULT_VISUAL_THEME_PACK_ID,
      storyTone: '',
      episodeChainPreferred: false,
      customStyleDescription: '',
      customVisualPrompt: '',
      customStyleOverlayOpen: false,
      playbackSubtitlesOn: true,
      subtitlePlaybackPresetId: DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID,
      narrationDraft: createDefaultNarrationSettings()
    })
    persistCustomSlice({
      customStyleDescription: '',
      recentCustomStyles: recent
    })
  },
  initializeWorkspaceSlots: () => {
    if (workspaceBootstrapDone) return
    workspaceApplyDepth++
    try {
      const disk = loadWorkspaceSlotsDisk()
      if (disk) {
        const slots = disk.slots.map(normalizeWorkspaceSlot)
        const ix = Math.min(4, Math.max(0, disk.activeIndex))
        set({ workspaceSlots: slots, activeWorkspaceSlotIndex: ix })
        const snap = slots[ix]
        set({
          ...snap.studio,
          styleId: migrateVisualStyleId(snap.studio.styleId) as StyleSelection,
          project: snap.project,
          selectedEpisode: snap.project ? snap.selectedEpisode : null,
          streamReveal: null,
          job: null,
          busy: null,
          generationAbort: null,
          lastError: null
        })
        applyRuntimeFromWorkspace(set, get, ix)
        lastWorkspaceFingerprint = workspaceFingerprint(workspaceSnapshotSource(get))
        workspaceBootstrapDone = true
        return
      }
      const snap = snapshotFromStore(workspaceSnapshotSource(get))
      const slots: WorkspaceSlotSnapshot[] = [
        snap,
        emptyWorkspaceSlot(),
        emptyWorkspaceSlot(),
        emptyWorkspaceSlot(),
        emptyWorkspaceSlot()
      ]
      set({ workspaceSlots: slots, activeWorkspaceSlotIndex: 0 })
      saveWorkspaceSlotsDisk({ v: 1, activeIndex: 0, slots })
      applyRuntimeFromWorkspace(set, get, 0)
      lastWorkspaceFingerprint = workspaceFingerprint(workspaceSnapshotSource(get))
      workspaceBootstrapDone = true
    } finally {
      workspaceApplyDepth--
    }
  },
  switchWorkspaceSlot: (to) => {
    if (to < 0 || to > 4 || to !== Math.floor(to)) return 'invalid'
    const cur = get().activeWorkspaceSlotIndex
    if (to === cur) return 'ok'
    workspaceApplyDepth++
    try {
      const slots = [...get().workspaceSlots]
      const rt = [...get().workspaceRuntime]
      rt[cur] = {
        ...rt[cur],
        busy: get().busy,
        lastError: get().lastError,
        job: get().job,
        streamReveal: get().streamReveal,
        generationAbort: get().generationAbort
      }
      slots[cur] = snapshotFromStore(workspaceSnapshotSource(get))
      const next = slots[to]
      set({
        workspaceSlots: slots,
        activeWorkspaceSlotIndex: to,
        ...next.studio,
        project: next.project,
        selectedEpisode: next.project ? next.selectedEpisode : null,
        streamReveal: null,
        job: null,
        busy: null,
        generationAbort: null,
        lastError: null,
        customStyleOverlayOpen: false
      })
      set({ workspaceRuntime: rt })
      applyRuntimeFromWorkspace(set, get, to)
      saveWorkspaceSlotsDisk({ v: 1, activeIndex: to, slots })
      lastWorkspaceFingerprint = workspaceFingerprint(workspaceSnapshotSource(get))
    } finally {
      workspaceApplyDepth--
    }
    return 'ok'
  },
  duplicateWorkspaceSlot: (from) => {
    if (from < 0 || from > 4 || from !== Math.floor(from)) return 'invalid'
    const slots = [...get().workspaceSlots]
    const emptyIx = slots.findIndex((s, i) => i !== from && !s.project && !s.studio.idea.trim())
    if (emptyIx < 0) return 'full'
    const base = JSON.parse(JSON.stringify(slots[from])) as WorkspaceSlotSnapshot
    const titleHint =
      base.meta.displayTitle?.trim() ||
      base.project?.title?.trim() ||
      uiTextGlobal('workspaceSlotN', { n: from + 1 })
    base.meta = {
      ...base.meta,
      displayTitle: `${titleHint}${uiTextGlobal('workspaceTitleCopySuffix')}`.slice(0, 120),
      lastEditedAt: new Date().toISOString(),
      archived: false
    }
    if (base.project) {
      base.project = {
        ...base.project,
        id: newProjectId(),
        title: `${base.project.title || uiTextGlobal('workspaceDuplicateStoryFallback')}${uiTextGlobal('workspaceTitleCopySuffix')}`.slice(
          0,
          120
        ),
        updatedAt: new Date().toISOString()
      }
    }
    slots[emptyIx] = base
    set({ workspaceSlots: slots })
    saveWorkspaceSlotsDisk({ v: 1, activeIndex: get().activeWorkspaceSlotIndex, slots })
    return 'ok'
  },
  clearWorkspaceSlot: (index) => {
    if (index < 0 || index > 4 || index !== Math.floor(index)) return
    const slots = [...get().workspaceSlots]
    const active = get().activeWorkspaceSlotIndex
    slots[index] = emptyWorkspaceSlot()
    set({ workspaceSlots: slots })
    if (index === active) {
      workspaceApplyDepth++
      try {
        const snap = slots[index]
        set({
          ...snap.studio,
          project: null,
          selectedEpisode: null,
          streamReveal: null,
          job: null,
          busy: null,
          generationAbort: null,
          lastError: null
        })
      } finally {
        workspaceApplyDepth--
      }
    }
    saveWorkspaceSlotsDisk({ v: 1, activeIndex: get().activeWorkspaceSlotIndex, slots })
    lastWorkspaceFingerprint = workspaceFingerprint(workspaceSnapshotSource(get))
  },
  setWorkspaceSlotArchived: (index, archived) => {
    if (index < 0 || index > 4) return
    const slots = [...get().workspaceSlots]
    slots[index] = {
      ...slots[index],
      meta: { ...slots[index].meta, archived, lastEditedAt: new Date().toISOString() }
    }
    set({ workspaceSlots: slots })
    saveWorkspaceSlotsDisk({ v: 1, activeIndex: get().activeWorkspaceSlotIndex, slots })
  },
  renameWorkspaceSlot: (index, title) => {
    if (index < 0 || index > 4) return
    const slots = [...get().workspaceSlots]
    slots[index] = {
      ...slots[index],
      meta: {
        ...slots[index].meta,
        displayTitle: title.trim().slice(0, 120),
        lastEditedAt: new Date().toISOString()
      }
    }
    set({ workspaceSlots: slots })
    saveWorkspaceSlotsDisk({ v: 1, activeIndex: get().activeWorkspaceSlotIndex, slots })
  }
}))

useStudioStore.subscribe(() => {
  if (workspaceApplyDepth > 0 || !workspaceBootstrapDone) return
  const fp = workspaceFingerprint(workspaceSnapshotSource(() => useStudioStore.getState()))
  if (fp === lastWorkspaceFingerprint) return
  lastWorkspaceFingerprint = fp
  if (workspaceAutosaveTimer) clearTimeout(workspaceAutosaveTimer)
  workspaceAutosaveTimer = setTimeout(() => {
    const live = useStudioStore.getState()
    if (workspaceApplyDepth > 0) return
    const ix = live.activeWorkspaceSlotIndex
    const snap = snapshotFromStore(workspaceSnapshotSource(() => live))
    const prev = live.workspaceSlots[ix]
    const prevFp = JSON.stringify({ studio: prev?.studio, project: prev?.project, selectedEpisode: prev?.selectedEpisode })
    const nextFp = JSON.stringify({ studio: snap.studio, project: snap.project, selectedEpisode: snap.selectedEpisode })
    if (prevFp === nextFp) return
    const slots = [...live.workspaceSlots]
    slots[ix] = snap
    useStudioStore.setState({ workspaceSlots: slots })
    saveWorkspaceSlotsDisk({ v: 1, activeIndex: ix, slots })
    lastWorkspaceFingerprint = workspaceFingerprint(workspaceSnapshotSource(() => useStudioStore.getState()))
  }, 520)
})
