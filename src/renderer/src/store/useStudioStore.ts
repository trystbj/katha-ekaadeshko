import { create } from 'zustand'
import type { AspectMode, ProjectState, VisualStyleId } from '../types/story'
import { defaultProject } from '../types/story'

export type ThemeChoice = 'light' | 'dark' | 'system'

interface StudioState {
  theme: ThemeChoice
  uiLanguage: string
  idea: string
  backendCountry: string
  backendTheme: string
  backendGenre: string
  backendLength: string
  styleId: VisualStyleId
  aspectMode: AspectMode
  project: ProjectState | null
  busy: string | null
  lastError: string | null
  settingsOpen: boolean
  projectPickerOpen: boolean
  selectedEpisode: number | null
  authEmail: string | null
  job: { id: string; stage: string; progress: number; log: string[] } | null
  setTheme: (t: ThemeChoice) => void
  setUiLanguage: (lng: string) => void
  setIdea: (s: string) => void
  setBackendCountry: (s: string) => void
  setBackendTheme: (s: string) => void
  setBackendGenre: (s: string) => void
  setBackendLength: (s: string) => void
  setStyleId: (s: VisualStyleId) => void
  setAspectMode: (a: AspectMode) => void
  setProject: (p: ProjectState | null) => void
  patchProject: (fn: (p: ProjectState) => ProjectState) => void
  setBusy: (m: string | null) => void
  setError: (e: string | null) => void
  setSettingsOpen: (v: boolean) => void
  setProjectPickerOpen: (v: boolean) => void
  setSelectedEpisode: (n: number | null) => void
  setAuthEmail: (email: string | null) => void
  setJob: (j: StudioState['job']) => void
  newBlankProject: () => void
}

export const useStudioStore = create<StudioState>((set, get) => ({
  theme: 'system',
  uiLanguage: 'en',
  idea: '',
  backendCountry: 'Japan',
  backendTheme: 'urban legend',
  backendGenre: 'horror',
  backendLength: 'medium',
  styleId: 'cinematic_anime',
  aspectMode: 'vertical_9_16',
  project: null,
  busy: null,
  lastError: null,
  settingsOpen: false,
  projectPickerOpen: false,
  selectedEpisode: null,
  authEmail: null,
  job: null,
  setTheme: (theme) => set({ theme }),
  setUiLanguage: (uiLanguage) => set({ uiLanguage }),
  setIdea: (idea) => set({ idea }),
  setBackendCountry: (backendCountry) => set({ backendCountry }),
  setBackendTheme: (backendTheme) => set({ backendTheme }),
  setBackendGenre: (backendGenre) => set({ backendGenre }),
  setBackendLength: (backendLength) => set({ backendLength }),
  setStyleId: (styleId) => set({ styleId }),
  setAspectMode: (aspectMode) => set({ aspectMode }),
  setProject: (project) =>
    set({
      project,
      selectedEpisode: project?.episodes.length ? project.episodes[project.episodes.length - 1].number : null
    }),
  patchProject: (fn) => {
    const p = get().project
    if (!p) return
    set({ project: fn(p) })
  },
  setBusy: (busy) => set({ busy }),
  setError: (lastError) => set({ lastError }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setProjectPickerOpen: (projectPickerOpen) => set({ projectPickerOpen }),
  setSelectedEpisode: (selectedEpisode) => set({ selectedEpisode }),
  setAuthEmail: (authEmail) => set({ authEmail }),
  setJob: (job) => set({ job }),
  newBlankProject: () =>
    set({
      project: defaultProject({ title: 'Untitled Story', status: 'new' }),
      selectedEpisode: null,
      lastError: null,
      job: null
    })
}))
