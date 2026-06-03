import type { ProjectState, StoryEpisode } from '../types/story'
import type { StoryHealthMetrics, StoryHealthVisualMetric } from './storyHealthMetrics'
import { computeStoryHealthMetrics } from './storyHealthMetrics'

type QualityReport = {
  score?: number
  narrationScore?: number
  dialogueScore?: number
  continuityScore?: number
  version?: number
}

function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)))
}

function toPct01(v: number | undefined, fallback: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return fallback
  return clampScore(v <= 1 ? v * 100 : v)
}

/** Bundle for /api/creator-quality (script + plan when available). */
export function buildEpisodeQualityBundle(project: ProjectState, episode: StoryEpisode) {
  const script = episode.scenes.map((s, i) => ({
    scene: s.index || i + 1,
    narration: s.narration || s.text || '',
    visual_description: s.visual_description || '',
    action: s.action || '',
    mood: s.emotional_tone || '',
    emotional_tone: s.emotional_tone || '',
    environment: s.location || '',
    dialogue: (s.dialogueLines || []).map((d) => ({ character: d.character, line: d.line }))
  }))
  return {
    script,
    cinematicDirectorPlan: project.cinematicDirectorPlan,
    continuity: project.continuityNotes ? { warnings: project.continuityNotes } : undefined,
    characters: project.bible?.characters,
    storyBible: project.storyBible
  }
}

/** Evidence-based merge — no placeholder floors. */
export function mergeStoryHealthWithQualityReport(
  local: StoryHealthMetrics,
  report: QualityReport | null | undefined,
  coverage: { total: number; withImage: number; missing: number[] }
): StoryHealthMetrics {
  if (!report?.version) return local

  const storyFromApi = toPct01(report.score, local.story)
  const narration = toPct01(report.narrationScore, local.narration)
  const continuity = toPct01(report.continuityScore, local.continuity)
  const dialogue = toPct01(report.dialogueScore, local.story)

  const story = clampScore(storyFromApi * 0.5 + dialogue * 0.2 + local.story * 0.3)
  const character = local.character
  const emotion = clampScore(local.emotion * 0.55 + story * 0.45)

  let visual: StoryHealthVisualMetric = local.visual
  if (coverage.withImage > 0 && typeof local.visual === 'number') {
    const ratio = coverage.withImage / Math.max(1, coverage.total)
    const alignPenalty = coverage.missing.length ? Math.min(25, coverage.missing.length * 5) : 0
    visual = clampScore(local.visual * 0.6 + continuity * 0.2 + ratio * 20 - alignPenalty)
  }

  return {
    story,
    character,
    narration,
    visual,
    emotion,
    continuity
  }
}

export async function fetchStoryHealthMetrics(
  project: ProjectState,
  episode: StoryEpisode,
  coverage: { total: number; withImage: number; missing: number[] }
): Promise<StoryHealthMetrics> {
  const local = computeStoryHealthMetrics(project, episode, coverage)
  try {
    const r = await fetch('/api/creator-quality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode: buildEpisodeQualityBundle(project, episode) })
    })
    if (!r.ok) return local
    const j = (await r.json()) as { report?: QualityReport }
    return mergeStoryHealthWithQualityReport(local, j.report, coverage)
  } catch {
    return local
  }
}
