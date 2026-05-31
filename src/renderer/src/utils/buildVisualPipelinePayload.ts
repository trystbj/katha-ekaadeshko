import type { ProjectState, StoryEpisode } from '../types/story'
import { parsePipelinePayloadFromEpisode } from './productionWorkflow'
import { episodeSceneImageCoverage } from './storyboardWorkflow'

/** Build Leonardo visual pipeline payload from episode (rawStructured or live scenes). */
export function buildVisualPipelinePayload(
  project: ProjectState,
  episodeNumber: number
): {
  story: Record<string, unknown>
  script: Record<string, unknown>[]
  images: Record<string, unknown>[]
  metadata?: Record<string, unknown>
} | null {
  const ep = project.episodes.find((e) => e.number === episodeNumber) ?? project.episodes[0]
  if (!ep) return null

  const fromRaw = parsePipelinePayloadFromEpisode(ep)
  if (fromRaw) return fromRaw

  if (!project.bible?.characters?.length && !ep.scenes?.length) return null

  const story: Record<string, unknown> = {
    title: project.title,
    setting: project.bible?.concept ?? '',
    characters: (project.bible?.characters ?? []).map((c) => ({
      name: c.name,
      role: c.role || c.personality,
      traits: c.visualIdentity || c.appearance || c.personality,
      appearance: c.appearance || c.visualIdentity,
      visualIdentity: c.visualIdentity
    }))
  }

  const script = (ep.scenes ?? []).map((s) => ({
    scene: s.index,
    narration: (s.narrationText ?? s.text ?? '').trim(),
    composed_narration: (s.narrationText ?? s.text ?? '').trim(),
    dialogue: (s.dialogueLines ?? []).map((d) => ({
      character: d.character,
      line: d.line
    })),
    visual_description: s.visualDescription ?? '',
    mood: s.emotionalTone ?? '',
    camera: s.cameraDirection ?? '',
    environment: s.environment ?? '',
    action: s.characterActions ?? ''
  }))

  if (!script.length) return null

  return {
    story,
    script,
    images: [],
    metadata: ep.cinematicDirectorPlan ? { cinematicDirectorPlan: ep.cinematicDirectorPlan } : {}
  }
}

export function episodeMissingSceneIndices(project: ProjectState, episode: StoryEpisode): number[] {
  return episodeSceneImageCoverage(project, episode.number).missing
}
