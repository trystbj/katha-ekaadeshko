import type { ProjectState } from '../types/story'

/** Client-side guard — skip duplicate in-flight scene generation requests. */
const inFlight = new Set<string>()

function key(projectId: string, sceneIndex: number): string {
  return `${projectId}:scene:${sceneIndex}`
}

export function tryAcquireClientSceneLock(projectId: string, sceneIndex: number): boolean {
  const k = key(projectId, sceneIndex)
  if (inFlight.has(k)) return false
  inFlight.add(k)
  return true
}

export function releaseClientSceneLock(projectId: string, sceneIndex: number): void {
  inFlight.delete(key(projectId, sceneIndex))
}

export function sceneIndicesForParallelGeneration(
  project: ProjectState,
  episodeNumber: number,
  requested?: number[]
): number[] {
  if (requested?.length) return [...new Set(requested)]
  const ep = project.episodes.find((e) => e.number === episodeNumber) ?? project.episodes[0]
  return (ep?.scenes ?? [])
    .filter((s) => s.productionStatus !== 'skipped')
    .map((s) => s.index)
}

export function markScenesQueued(project: ProjectState, episodeNumber: number, indices: number[]): ProjectState {
  const set = new Set(indices)
  return {
    ...project,
    episodes: project.episodes.map((e) =>
      e.number === episodeNumber
        ? {
            ...e,
            scenes: e.scenes.map((s) =>
              set.has(s.index) && s.productionStatus !== 'skipped'
                ? { ...s, productionStatus: 'queued' as const }
                : s
            )
          }
        : e
    ),
    updatedAt: new Date().toISOString()
  }
}
