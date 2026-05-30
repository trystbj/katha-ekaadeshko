import type { ProjectState, SceneProductionStatus } from '../types/story'
import { withStoryboardReady } from './storyboardWorkflow'

/** User approved script and requested parallel scene image generation (post-review only). */
export function withVisualGenerationApproved(
  project: ProjectState,
  episodeNumber: number
): ProjectState {
  const now = new Date().toISOString()
  return withStoryboardReady(
    {
      ...project,
      productionStage: 'visual_generation',
      assetsGenerationApproved: true,
      assetsGenerationApprovedAt: now,
      episodes: project.episodes.map((e) =>
        e.number === episodeNumber
          ? {
              ...e,
              scenes: e.scenes.map((s) => {
                if (s.productionStatus === 'skipped') return s
                const status: SceneProductionStatus = 'queued'
                return { ...s, productionStatus: status, generationStatus: 'image' }
              })
            }
          : e
      ),
      updatedAt: now
    },
    { partial: true, episodeNumber }
  )
}

export function hasApprovedVisualGeneration(project: ProjectState | null | undefined): boolean {
  return Boolean(project?.assetsGenerationApproved)
}
