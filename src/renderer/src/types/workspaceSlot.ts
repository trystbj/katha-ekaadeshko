import type { AspectSelection, NarrationSettings, ProjectState, StyleSelection } from './story'
import type { StudioSeasonId } from '../constants/studioSeasonThemes'
import type { VisualThemePackId } from '../constants/visualThemePacks'

/** Story-studio fields isolated per parallel workspace slot (UI language & theme stay global). */
export type WorkspaceStudioSlice = {
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
}

export type WorkspaceSlotMeta = {
  displayTitle?: string
  archived?: boolean
  lastEditedAt: string
}

export type WorkspaceSlotSnapshot = {
  v: 1
  meta: WorkspaceSlotMeta
  studio: WorkspaceStudioSlice
  selectedEpisode: number | null
  project: ProjectState | null
}
