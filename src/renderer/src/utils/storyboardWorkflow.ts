import type { ProjectState } from '../types/story'
import { sceneUrlForIndex } from './sceneAssetMap'

/** Storyboard-first pipeline phase (persisted on project when known). */
export type StoryboardWorkflowPhase = 'idle' | 'storyboard' | 'rendering' | 'complete'

export function episodeSceneImageCoverage(
  project: ProjectState | null | undefined,
  episodeNumber = 1
): { total: number; withImage: number; missing: number[] } {
  if (!project?.bible) return { total: 0, withImage: 0, missing: [] }
  const ep = project.episodes.find((e) => e.number === episodeNumber) ?? project.episodes[0]
  const scenes = ep?.scenes ?? []
  const missing: number[] = []
  let withImage = 0
  for (const s of scenes) {
    if (sceneUrlForIndex(project, s.index)) withImage++
    else missing.push(s.index)
  }
  return { total: scenes.length, withImage, missing }
}

export function isStoryboardReady(project: ProjectState | null | undefined): boolean {
  if (!project?.bible) return false
  const ep = project.episodes[project.episodes.length - 1]
  if (!ep?.scenes?.length) return false
  const cov = episodeSceneImageCoverage(project, ep.number)
  return cov.total > 0 && cov.withImage === cov.total
}

export function canShowStoryboardWorkspace(project: ProjectState | null | undefined): boolean {
  if (!project?.bible) return false
  const ep = project.episodes[0]
  return Boolean(ep?.scenes?.length)
}

export function deriveWorkflowPhase(
  project: ProjectState | null | undefined,
  busy: string | null | undefined
): StoryboardWorkflowPhase {
  if (busy === 'rendering') return 'rendering'
  if (project?.lastRenderVideoUrl) return 'complete'
  if (project?.workflowPhase === 'storyboard' || canShowStoryboardWorkspace(project)) return 'storyboard'
  return project?.workflowPhase ?? 'idle'
}

export function withStoryboardReady(
  project: ProjectState,
  opts?: { partial?: boolean; missingSceneIndices?: number[] }
): ProjectState {
  const now = new Date().toISOString()
  const ep = project.episodes[0]
  const cov = episodeSceneImageCoverage(project, ep?.number ?? 1)
  const partial = opts?.partial ?? cov.missing.length > 0
  const missing = opts?.missingSceneIndices ?? cov.missing
  return {
    ...project,
    workflowPhase: 'storyboard',
    storyboardReady: true,
    storyboardPartial: partial,
    missingSceneImageIndices: missing.length ? missing : undefined,
    storyboardReadyAt: now,
    lastRenderVideoUrl: undefined,
    renderJobId: undefined,
    updatedAt: now
  }
}

export function withRenderStarted(project: ProjectState): ProjectState {
  return {
    ...project,
    workflowPhase: 'rendering',
    updatedAt: new Date().toISOString()
  }
}

export function withRenderComplete(project: ProjectState, videoUrl: string): ProjectState {
  return {
    ...project,
    workflowPhase: 'complete',
    lastRenderVideoUrl: videoUrl,
    renderJobId: undefined,
    updatedAt: new Date().toISOString()
  }
}
