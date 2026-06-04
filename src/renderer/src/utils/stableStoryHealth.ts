import type { ProjectState, StoryEpisode } from '../types/story'
import type { StoryHealthMetrics } from './storyHealthMetrics'
import { computeStoryHealthMetrics } from './storyHealthMetrics'
import { episodeSceneImageCoverage } from '../utils/storyboardWorkflow'

const cache = new Map<string, StoryHealthMetrics>()

function fingerprint(project: ProjectState, episode: StoryEpisode): string {
  const scenes = episode.scenes ?? []
  const sceneSig = scenes
    .map(
      (s) =>
        `${s.index}:${(s.narration || s.text || '').length}:${(s.visual_description || '').length}:${s.dialogueLines?.length ?? 0}:${s.emotional_tone || ''}`
    )
    .join('|')
  const castSig = (project.bible?.characters ?? [])
    .map((c) => `${c.id}:${c.baseImageUrl || ''}:${c.visualIdentity?.length ?? 0}`)
    .join('|')
  const cov = episodeSceneImageCoverage(project, episode.number)
  const pipe = project.pipelineValidationReport
  const pipeSig = pipe
    ? `${pipe.updatedAt}:${pipe.healthPercent}:${pipe.animationReady ? 1 : 0}:${pipe.validatedImageCount}/${pipe.totalScenes}:${pipe.narrationState}`
    : '0'
  return `${project.id}:${episode.number}:${sceneSig}:${castSig}:${cov.withImage}/${cov.total}:${pipeSig}:${project.storyboardReady ? 1 : 0}`
}

/**
 * Deterministic health metrics — stable until story/assets actually change.
 */
export function computeStableStoryHealth(
  project: ProjectState,
  episode: StoryEpisode
): StoryHealthMetrics {
  const key = fingerprint(project, episode)
  const hit = cache.get(key)
  if (hit) return hit
  const coverage = episodeSceneImageCoverage(project, episode.number)
  const metrics = computeStoryHealthMetrics(
    project,
    episode,
    coverage,
    project.pipelineValidationReport
  )
  cache.set(key, metrics)
  if (cache.size > 48) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return metrics
}
