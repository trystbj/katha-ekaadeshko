import type { ProjectState } from '../types/story'
import type { CreatorHistoryEntry, CreatorStudioProjectState } from '../types/creatorStudio'
import { defaultCreatorStudioState } from '../types/creatorStudio'

const MAX_HISTORY = 24

function studioOf(project: ProjectState): CreatorStudioProjectState {
  return project.creatorStudio ?? defaultCreatorStudioState()
}

export function pushCreatorSnapshot(project: ProjectState, label: string, episodeNumber: number): ProjectState {
  const cs = studioOf(project)
  const entry: CreatorHistoryEntry = {
    id: `h_${Date.now()}`,
    label,
    at: new Date().toISOString(),
    episodeNumber,
    snapshot: JSON.stringify({ episodes: project.episodes, creatorStudio: cs })
  }
  const trimmed = cs.history.slice(0, cs.historyIndex + 1)
  trimmed.push(entry)
  const history = trimmed.slice(-MAX_HISTORY)
  return {
    ...project,
    creatorStudio: {
      ...cs,
      history,
      historyIndex: history.length - 1
    }
  }
}

export function creatorUndo(project: ProjectState): ProjectState {
  const cs = studioOf(project)
  if (cs.historyIndex <= 0) return project
  const entry = cs.history[cs.historyIndex - 1]
  if (!entry) return project
  try {
    const parsed = JSON.parse(entry.snapshot) as { episodes: ProjectState['episodes']; creatorStudio: CreatorStudioProjectState }
    return {
      ...project,
      episodes: parsed.episodes,
      creatorStudio: { ...parsed.creatorStudio, history: cs.history, historyIndex: cs.historyIndex - 1 }
    }
  } catch {
    return project
  }
}

export function creatorRedo(project: ProjectState): ProjectState {
  const cs = studioOf(project)
  if (cs.historyIndex >= cs.history.length - 1) return project
  const entry = cs.history[cs.historyIndex + 1]
  if (!entry) return project
  try {
    const parsed = JSON.parse(entry.snapshot) as { episodes: ProjectState['episodes']; creatorStudio: CreatorStudioProjectState }
    return {
      ...project,
      episodes: parsed.episodes,
      creatorStudio: { ...parsed.creatorStudio, history: cs.history, historyIndex: cs.historyIndex + 1 }
    }
  } catch {
    return project
  }
}

export function canCreatorUndo(project: ProjectState | null): boolean {
  return (project?.creatorStudio?.historyIndex ?? -1) > 0
}

export function canCreatorRedo(project: ProjectState | null): boolean {
  const cs = project?.creatorStudio
  if (!cs) return false
  return cs.historyIndex >= 0 && cs.historyIndex < cs.history.length - 1
}
