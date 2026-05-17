import {
  DEFAULT_ASPECT,
  DEFAULT_BACKEND_GENRE,
  DEFAULT_BACKEND_LENGTH,
  DEFAULT_BACKEND_THEME,
  DEFAULT_NARRATOR_ID,
  DEFAULT_STORY_COUNTRY,
  DEFAULT_STORY_LANGUAGE,
  DEFAULT_STYLE_ID
} from '../constants/studioDefaults'
import { DEFAULT_VISUAL_THEME_PACK_ID } from '../constants/visualThemePacks'
import {
  DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID,
  isSubtitlePlaybackPresetId
} from '../constants/subtitlePlaybackPresets'
import {
  createDefaultNarrationSettings,
  sanitizeNarrationSettingsLanguage
} from '../constants/narrationLanguages'
import { normalizeNarratorId } from '../constants/narrators'
import {
  DEFAULT_STUDIO_SEASON,
  normalizeStudioSeasonId,
  type StudioSeasonId
} from '../constants/studioSeasonThemes'
import { migrateProjectBibleStyleId, migrateVisualStyleId } from './styleIdMigration'
import type { AspectSelection, NarrationSettings, ProjectState, StyleSelection } from '../types/story'
import type { WorkspaceSlotSnapshot, WorkspaceStudioSlice } from '../types/workspaceSlot'
import type { VisualThemePackId } from '../constants/visualThemePacks'

/** Narrow store slice used for snapshots (avoids circular imports with useStudioStore). */
export type WorkspaceSnapshotSource = {
  activeWorkspaceSlotIndex: number
  workspaceSlots: WorkspaceSlotSnapshot[]
  storyLanguage: string
  storyCountry: string
  idea: string
  workingTitle: string
  mainCharacterName: string
  backendTheme: string
  backendGenre: string
  backendLength: string
  uiFontMode: 'clean' | 'story' | 'comic'
  styleId: StyleSelection
  aspectMode: AspectSelection
  narratorId: string
  narrationDraft: NarrationSettings
  studioSeasonId: StudioSeasonId
  visualPackId: VisualThemePackId
  storyTone: '' | 'warm' | 'tense' | 'epic' | 'tender' | 'whimsical' | 'noir'
  episodeChainPreferred: boolean
  customVisualPrompt: string
  playbackSubtitlesOn: boolean
  subtitlePlaybackPresetId: string
  selectedEpisode: number | null
  project: ProjectState | null
  busy: string | null
  streamReveal: { visibleLen: number } | null
  job: { progress: number } | null
}

/** Serializable fingerprint for autosave debouncing (excludes workspace slot array itself). */
export function workspaceFingerprint(state: WorkspaceSnapshotSource): string {
  return JSON.stringify({
    idx: state.activeWorkspaceSlotIndex,
    project: state.project,
    selectedEpisode: state.selectedEpisode,
    idea: state.idea,
    workingTitle: state.workingTitle,
    mainCharacterName: state.mainCharacterName,
    storyLanguage: state.storyLanguage,
    storyCountry: state.storyCountry,
    backendTheme: state.backendTheme,
    backendGenre: state.backendGenre,
    backendLength: state.backendLength,
    uiFontMode: state.uiFontMode,
    styleId: state.styleId,
    aspectMode: state.aspectMode,
    narratorId: state.narratorId,
    narrationDraft: state.narrationDraft,
    studioSeasonId: state.studioSeasonId,
    visualPackId: state.visualPackId,
    storyTone: state.storyTone,
    episodeChainPreferred: state.episodeChainPreferred,
    customVisualPrompt: state.customVisualPrompt,
    playbackSubtitlesOn: state.playbackSubtitlesOn,
    subtitlePlaybackPresetId: state.subtitlePlaybackPresetId,
    busy: state.busy,
    streamRevealLen: state.streamReveal?.visibleLen ?? null,
    jobProg: state.job?.progress ?? null
  })
}

export function emptyWorkspaceSlot(): WorkspaceSlotSnapshot {
  const now = new Date().toISOString()
  const studio: WorkspaceStudioSlice = {
    storyLanguage: DEFAULT_STORY_LANGUAGE,
    storyCountry: DEFAULT_STORY_COUNTRY,
    idea: '',
    workingTitle: '',
    mainCharacterName: '',
    backendTheme: DEFAULT_BACKEND_THEME,
    backendGenre: DEFAULT_BACKEND_GENRE,
    backendLength: DEFAULT_BACKEND_LENGTH,
    uiFontMode: 'story',
    styleId: DEFAULT_STYLE_ID as WorkspaceStudioSlice['styleId'],
    aspectMode: DEFAULT_ASPECT as WorkspaceStudioSlice['aspectMode'],
    narratorId: DEFAULT_NARRATOR_ID,
    narrationDraft: createDefaultNarrationSettings(),
    studioSeasonId: DEFAULT_STUDIO_SEASON,
    visualPackId: DEFAULT_VISUAL_THEME_PACK_ID,
    storyTone: '',
    episodeChainPreferred: false,
    customVisualPrompt: '',
    playbackSubtitlesOn: true,
    subtitlePlaybackPresetId: DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID
  }
  return {
    v: 1,
    meta: { lastEditedAt: now },
    studio,
    selectedEpisode: null,
    project: null
  }
}

/** Snapshot current root studio fields + project (deep clone project JSON). */
export function snapshotFromStore(state: WorkspaceSnapshotSource): WorkspaceSlotSnapshot {
  const studio: WorkspaceStudioSlice = {
    storyLanguage: state.storyLanguage,
    storyCountry: state.storyCountry,
    idea: state.idea,
    workingTitle: state.workingTitle,
    mainCharacterName: state.mainCharacterName,
    backendTheme: state.backendTheme,
    backendGenre: state.backendGenre,
    backendLength: state.backendLength,
    uiFontMode: state.uiFontMode,
    styleId: state.styleId,
    aspectMode: state.aspectMode,
    narratorId: state.narratorId,
    narrationDraft: state.narrationDraft,
    studioSeasonId: state.studioSeasonId,
    visualPackId: state.visualPackId,
    storyTone: state.storyTone,
    episodeChainPreferred: state.episodeChainPreferred,
    customVisualPrompt: state.customVisualPrompt,
    playbackSubtitlesOn: state.playbackSubtitlesOn,
    subtitlePlaybackPresetId: state.subtitlePlaybackPresetId
  }
  const project = state.project ? (JSON.parse(JSON.stringify(state.project)) as ProjectState) : null
  return {
    v: 1,
    meta: {
      ...state.workspaceSlots[state.activeWorkspaceSlotIndex]?.meta,
      lastEditedAt: new Date().toISOString()
    },
    studio,
    selectedEpisode: state.selectedEpisode,
    project
  }
}

export function normalizeWorkspaceSlot(raw: unknown): WorkspaceSlotSnapshot {
  const e = emptyWorkspaceSlot()
  if (!raw || typeof raw !== 'object') return e
  const o = raw as Partial<WorkspaceSlotSnapshot>
  if (o.v !== 1 || !o.studio || typeof o.studio !== 'object') return e
  const mergedStudio = { ...e.studio, ...o.studio }
  mergedStudio.narratorId = normalizeNarratorId(mergedStudio.narratorId)
  if (!isSubtitlePlaybackPresetId(mergedStudio.subtitlePlaybackPresetId)) {
    mergedStudio.subtitlePlaybackPresetId = DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID
  }
  if (mergedStudio.narrationDraft) {
    mergedStudio.narrationDraft = sanitizeNarrationSettingsLanguage(mergedStudio.narrationDraft)
  }
  mergedStudio.styleId = migrateVisualStyleId(mergedStudio.styleId) as WorkspaceStudioSlice['styleId']
  mergedStudio.studioSeasonId = normalizeStudioSeasonId(mergedStudio.studioSeasonId)

  const rawProject =
    o.project && typeof o.project === 'object' ? ({ ...(o.project as ProjectState) } as ProjectState) : null
  let project =
    rawProject?.narration != null
      ? { ...rawProject, narration: sanitizeNarrationSettingsLanguage(rawProject.narration) }
      : rawProject
  if (project?.bible?.narratorId != null && String(project.bible.narratorId).trim() !== '') {
    project = {
      ...project,
      bible: { ...project.bible, narratorId: normalizeNarratorId(project.bible.narratorId) }
    }
  }
  if (project?.bible?.narration != null) {
    project = {
      ...project,
      bible: {
        ...project.bible,
        narration: sanitizeNarrationSettingsLanguage(project.bible.narration)
      }
    }
  }
  if (project?.bible?.styleId) {
    const migrated = migrateProjectBibleStyleId(project.bible.styleId)
    if (migrated && migrated !== project.bible.styleId) {
      project = { ...project, bible: { ...project.bible, styleId: migrated } }
    }
  }

  return {
    v: 1,
    meta: {
      lastEditedAt: typeof o.meta?.lastEditedAt === 'string' ? o.meta.lastEditedAt : e.meta.lastEditedAt,
      displayTitle: typeof o.meta?.displayTitle === 'string' ? o.meta.displayTitle : undefined,
      archived: Boolean(o.meta?.archived)
    },
    studio: mergedStudio,
    selectedEpisode: typeof o.selectedEpisode === 'number' || o.selectedEpisode === null ? o.selectedEpisode : null,
    project
  }
}

export function slotPosterUrl(project: ProjectState | null): string | undefined {
  if (!project?.assets?.length) {
    const ch = project?.bible?.characters?.find((c) => c.baseImageUrl)
    return ch?.baseImageUrl
  }
  const scene = project.assets.find((a) => (a.kind === 'scene' || a.kind === 'background') && a.url)
  if (scene?.url) return scene.url
  const char = project.assets.find((a) => a.kind === 'character' && a.url)
  return char?.url
}

export function slotProgressPercent(project: ProjectState | null): number {
  if (!project?.bible?.totalEpisodes) return project?.bible ? 5 : 0
  const te = Math.max(1, project.bible.totalEpisodes)
  const written = project.episodes.length
  const exported = project.episodes.filter((x) => x.videoExportComplete).length
  const p = (written / te) * 52 + (exported / te) * 48
  return Math.min(100, Math.round(p))
}

export function slotPublishPublished(project: ProjectState | null): boolean {
  return project?.videoStudio?.draft?.publish?.jobStatus === 'published'
}
